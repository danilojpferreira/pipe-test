/**
 * 
 * @param {pipeline} String path to pipeline JSON file
 * @optional @param {options} String path to options JSON file
 * 
 */

module.exports.test = async function (pipeline, options, pwd) {
  const { forEachSeries } = require("p-iteration");
  const { appendFileSync, readFileSync, writeFileSync } = require("fs");
  const axios = require("axios");
  const { resolve } = require("path");
  
  const replacer = async (value) => {
    if (typeof value === "string") {
      if (value.includes("$global")) {
        const inx = value.split(".");
        inx.shift();
        let createString = "global";
        inx.forEach((i) => (createString += `['${i}']`));
        const newValue = await eval(createString);
        return newValue;
      }
      return value;
    } else if (Array.isArray(value)) {
      const arr = [];
      await forEachSeries(value, async (itemOfArray) => {
        const newItemOfArray = await replacer(itemOfArray);
        arr.push(newItemOfArray);
      });

      return arr;
    } else if (typeof value === "object") {
      const newValue = {};
      await forEachSeries(Object.keys(value), async (key) => {
        const newKey = await replacer(value[key]);
        newValue[key] = newKey;
      });
      return newValue;
    }
    return value;
  };

  const stringify = (obj) => {
    try {
      const parsed = JSON.stringify(obj);
      return parsed;
    } catch (error) {
      return obj;
    }
  };

  const sleep = (milliseconds) => {
    const date = Date.now();
    let currentDate = null;
    do currentDate = Date.now();
    while (currentDate - date < milliseconds);
  };

  let opt = {};
  let logPath = "";
  let resultPath = "";

  try {
    const json = readFileSync(options ?? "./options.json");
    opt = JSON.parse(json);
    logPath = `${
      opt.name_mode === "BY_DATE"
        ? `${opt.path ?? `${pwd}/`}${new Date()}.log`
        : opt.name_mode === "DEFAULT"
        ? `${opt.path ?? `${pwd}/`}result.log`
        : opt.name
        ? `${opt.path ?? `${pwd}/`}${opt.name}.log`
        : `${opt.path ?? `${pwd}/`}result.log`
    }`;
    resultPath = `${
      opt.name_mode === "BY_DATE"
        ? `${opt.path ?? `${pwd}/`}${new Date()}.json`
        : opt.name_mode === "DEFAULT"
        ? `${opt.path ?? `${pwd}/`}result.json`
        : opt.name
        ? `${opt.path ?? `${pwd}/`}${opt.name}.json`
        : `${opt.path ?? `${pwd}/`}result.json`
    }`;
  } catch (error) {
    console.warn("Error on get options JSON");
    return;
  }

  const log = (str) => {
    const newStr = `\n\n${new Date()} - ${str}`;
    appendFileSync(logPath, newStr);
  };

  let pipe = [];
  try {
    log("Getting JSON...");
    const json = readFileSync(pipeline ?? "./pipeline.json");
    pipe = JSON.parse(json);
    log("JSON getted...");
  } catch (error) {
    log("Error on get pipeline JSON");
    return;
  }

  const stagesResults = {
    SUCCESS: "SUCCESS",
    FAIL: "FAIL",
    UNDEFINED: "UNDEFINED",
  };
  let stopFlag = false;

  const setStageResult = (result) => {
    switch (result) {
      case stagesResults.SUCCESS:
        console.info(stagesResults.SUCCESS);
        return stagesResults.SUCCESS;
      case stagesResults.FAIL:
        console.warn(stagesResults.FAIL);
        stopFlag = true;
        return stagesResults.FAIL;
      default:
        console.warn(stagesResults.UNDEFINED);
        stopFlag = true;
        return stagesResults.UNDEFINED;
    }
  };

  const dealWithFunctionError = (error, response) => {
    if (error.code === "ECONNREFUSED")
      log(`Request error:\n${stringify(response)}\n${stringify(error)}`);

    return setStageResult(stagesResults.FAIL);
  };

  const stagesReturn = [];
  let global = {};

  const runStage = async (stage, index) => {
    const { type, request, result, funcs, variables } = stage;
    log(`Starting stage ${index + 1} --> ${type}`);
    console.info(`Starting stage ${index + 1} --> ${type}`);
    const stageInfo = {
      stage: index + 1,
      type,
      meta: { type, request, result, funcs, variables },
      result: null,
    };

    switch (type) {
      case "SET_GLOBAL":
        try {
          log(
            `Setting global variables.\nprevious state:\t${stringify(
              global
            )}\nnext state:\t${stringify(variables)}`
          );
          global = variables;
          stageInfo.result = setStageResult(stagesResults.SUCCESS);
        } catch (error) {
          setStageResult(stagesResults.FAIL);
        }
        break;
      case "CRUD":
        try {
          let response = null;
          const model = request.type.toLowerCase();
          const url = `${global.baseUrl ?? ""}${request.path}`;
          const config = {
            ...(global.config ?? null),
            ...request.config,
          };
          if (model === "delete" || model === "get") {
            log(
              `Doing crud of type:\t${model}\nto:\t${url}\nwith config:\t${config}`
            );
            try {
              response = await axios[request.type.toLowerCase()](url, config);
            } catch (error) {
              stageInfo.result = dealWithFunctionError(error, response);
              response = error;
            }
          } else {
            const data = {};
            if (request?.data?.length) {
              await forEachSeries(
                Object.keys(request.data).map((i) => i),
                async (key) => {
                  data[key] = await replacer(request.data[key]);
                }
              );
            }

            log(
              `Doing crud of type:\t${model}\nto:\t${url}\nwith config:\t${stringify(
                config
              )}\nwith data:\t${stringify(data)}`
            );
            try {
              response = await axios[request.type.toLowerCase()](
                url,
                data,
                config
              );
            } catch (error) {
              stageInfo.result = dealWithFunctionError(error, response);
              response = error;
            }
          }
          const responseStatus = response?.status?.toString() || "0";
          if (
            result.allow.includes(responseStatus) ||
            result.allow.includes("*")
          ) {
            stageInfo.result = setStageResult(stagesResults.SUCCESS);
            log(`Return success:\t${stringify(response)}`);
          } else if (
            result.deny.includes(responseStatus) ||
            result.deny.includes("*")
          ) {
            stageInfo.result = setStageResult(stagesResults.FAIL);
            log(`Return failed:\t${stringify(response)}`);
          } else stageInfo.result = setStageResult(stagesResults.UNDEFINED);

          await forEachSeries(funcs, async (func) => {
            try {
              log(`Trying eval function:\t${func}`);
              await eval(func);
            } catch (error) {
              log(`Error in eval function:\t${func}`);
            }
          });
        } catch (error) {
          setStageResult(stagesResults.FAIL);
        }
        break;
      default:
        break;
    }
    stagesReturn.push(stageInfo);
  };

  await forEachSeries(pipe, async (stage, index) => {
    if (!stopFlag) {
      await runStage(stage, index);
      sleep(opt.delay);
    }
  });

  writeFileSync(
    resultPath,
    JSON.stringify(stagesReturn, null, 2),
    "utf-8",
    (error) => {
      if (error) log(`Error on write results:\t${stringify(error)}`);
    }
  );

  console.info(`Log file writed in ${resolve(logPath)}`);
  console.info(`Result file writed in ${resolve(resultPath)}`);
};