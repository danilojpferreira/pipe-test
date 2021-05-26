/**
 *
 * @param {pipeline} String path to pipeline JSON file
 * @param {options} String path to options JSON file
 *
 */

const t = async (pipeline, options, pwd) => {
  if (!Array.isArray(pipeline) || !pipeline?.length) {
    console.log('pipeline should be a valid json, with at least 1 array element');
    return null;
  }

  const { forEachSeries } = require("p-iteration");
  const {
    appendFileSync,
    mkdirSync,
    writeFileSync,
    existsSync,
  } = require("fs");
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
    } else if (Array.isArray(value) && value?.length) {
      const arr = [];
      await forEachSeries(value, async (itemOfArray) => {
        const newItemOfArray = await replacer(itemOfArray);
        arr.push(newItemOfArray);
      });

      return arr;
    } else if (typeof value === "object") {
      const keys = Object.keys(value);
      const newValue = {};
      if (keys?.length) {
        await forEachSeries(keys, async (key) => {
          const newKey = await replacer(value[key]);
          newValue[key] = newKey;
        });
      }
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

  let logPath = "";
  let resultPath = "";

  try {
    const dir = `${pwd}/${options.path}`;
    if (!existsSync(dir)) mkdirSync(dir);

    const title = new Date().toISOString().split(".")[0];

    logPath = `${
      options.name_mode === "BY_DATE"
        ? `${dir}${title}.log`
        : options.name_mode === "CUSTOM" && options.name
        ? `${dir}${options.name}.log`
        : `${dir}result.log`
    }`;
    resultPath = `${
      options.name_mode === "BY_DATE"
        ? `${dir}${title}.json`
        : options.name_mode === "CUSTOM" && options.name
        ? `${dir}${options.name}.json`
        : `${dir}result.json`
    }`;
  } catch (error) {
    console.warn("Error on get options JSON", error);
    return;
  }

  const log = (str) => {
    const newStr = `\n\n${new Date()} - ${str}`;
    appendFileSync(logPath, newStr);
  };

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
    log(`Error:\n${stringify(response)}\n${stringify(error)}`);
    return setStageResult(stagesResults.FAIL);
  };

  const stagesReturn = [];
  let global = {};

  const runStage = async (stage, index) => {
    const { type, request, result, funcs, variables, description } = stage;
    log(
      `Starting stage ${index + 1} --> ${type} ${
        description ? `--> ${description}` : ""
      }`
    );
    console.info(
      `Starting stage ${index + 1} --> ${type} ${
        description ? `--> ${description}` : ""
      }`
    );
    const stageInfo = {
      stage: index + 1,
      type,
      meta: { type, request, result, funcs, variables, description },
      result: null,
    };

    switch (type) {
      case "SET_GLOBAL":
        log(
          `Setting global variables.\nprevious state:\t${stringify(
            global
          )}\nnext state:\t${stringify(variables)}`
        );
        global = variables;
        stageInfo.result = setStageResult(stagesResults.SUCCESS);

        break;
      case "CRUD":
        let response = null;
        const model = request.type.toLowerCase();
        const url = `${global.baseUrl ?? ""}${request.path}`;
        const config = {
          ...(global.config ?? null),
          ...request.config,
        };
        if (model === "delete" || model === "get") {
          log(
            `Doing crud of type:\t${model}\nto:\t${url}\nwith config:\t${stringify(
              config
            )}`
          );
          try {
            response = await axios[request.type.toLowerCase()](url, config);
          } catch (error) {
            stageInfo.result = dealWithFunctionError(error, response);
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
          }
        }
        const responseStatus = response?.status ?? 0;
        if (
          result.allow.includes(responseStatus) ||
          result.allow.includes("*")
        ) {
          log(`Return success:\t${stringify({status: response.status, headers: response.headers, config: response.config, data: response.data})}`);
          stageInfo.result = setStageResult(stagesResults.SUCCESS);
        } else if (
          result.deny.includes(responseStatus) ||
          result.deny.includes("*")
        ) {
          log(`Return failed:\t${stringify(response)}`);
          stageInfo.result = setStageResult(stagesResults.FAIL);
        } else stageInfo.result = setStageResult(stagesResults.UNDEFINED);

        if (funcs?.length) {
          await forEachSeries(funcs, async (func) => {
            try {
              log(`Trying eval function:\t${func}`);
              await eval(func);
            } catch (error) {
              log(`Error in eval function:\t${func}`);
            }
          });
        }
        break;
      default:
        break;
    }
    stagesReturn.push(stageInfo);
  };

  await forEachSeries(pipeline, async (stage, index) => {
    if (!stopFlag) {
      await runStage(stage, index);
      sleep(options.delay);
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
  console.info(`${!stopFlag ? 'PIPELINE FINISHED WITH SUCCESS' : 'PIPELINE FINISHED WITH ERRORS'}`)
  console.info(`Log file writed in ${resolve(logPath)}`);
  console.info(`Result file writed in ${resolve(resultPath)}`);
};

module.exports.test = t;
