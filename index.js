/**
 *
 * @param {pipeline} String path to pipeline JSON file
 * @param {options} String path to options JSON file
 *
 */

const t = async (pipeline, options, pwd) => {
  if (!Array.isArray(pipeline) || !pipeline?.length) {
    console.log(
      "pipeline should be a valid json, with at least 1 array element"
    );
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
      const globalString = "$global";
      if (value.includes(globalString)) {
        const regex = /\$global.+?(?=\/|$)/g;
        const matches = value.match(regex);
        if (matches?.length > 1) {
          await forEachSeries(matches, async (match) => {
            const replacerValue = await replacer(match);
            value = value.replace(match, replacerValue);
          });
        } else {
          let arr = [];
          let inx = value.split(".");
          if (inx[0] !== globalString && inx[1].includes("/")) {
            inx.forEach((val) => {
              const split = val.split("/");
              if (val.includes(globalString))
                arr.push(split.filter((val) => val === globalString)[0]);
              else arr.push(split[0]);
            });
            inx = arr;
          }
          inx.shift();
          let createString = "global";
          inx.forEach((i) => (createString += `['${i}']`));
          const newValue = await eval(createString);
          value = value.replace(matches[0], newValue);
        }
      }
      return value;
    } else if (Array.isArray(value)) {
      const arr = [];
      if (value?.length)
        await forEachSeries(value, async (itemOfArray) => {
          const newItemOfArray = await replacer(itemOfArray);
          arr.push(newItemOfArray);
        });
      return arr;
    } else if (value && typeof value === "object") {
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

  const mergeConfigs = (globalConfig, requestConfig) => {
    if (globalConfig) {
      const merge = { ...globalConfig };
      if (requestConfig && typeof requestConfig === "object") {
        Object.entries(requestConfig).forEach(([key, value]) => {
          if (key in globalConfig) {
            merge[key] =
              typeof value === "object" && !Array.isArray(value)
                ? { ...globalConfig[key], ...value }
                : value;
          }
        });
      }
      return merge;
    }
    return requestConfig;
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

  const stageTypes = {
    CRUD: "CRUD",
    SET_GLOBAL: "SET_GLOBAL",
  };

  const stageResults = {
    SUCCESS: "SUCCESS",
    FAIL: "FAIL",
    UNDEFINED: "UNDEFINED",
  };
  let stopFlag = false;

  const setStageResult = (result) => {
    switch (result) {
      case stageResults.SUCCESS:
        console.info(stageResults.SUCCESS);
        return stageResults.SUCCESS;
      case stageResults.FAIL:
        console.warn(stageResults.FAIL);
        stopFlag = true;
        return stageResults.FAIL;
      default:
        console.warn(stageResults.UNDEFINED);
        stopFlag = true;
        return stageResults.UNDEFINED;
    }
  };

  const stagesReturn = [];
  let global = {};

  const runStage = async (stage, index) => {
    const {
      type = stageTypes.CRUD,
      request,
      result,
      funcs,
      variables,
      description,
    } = stage;
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
      case stageTypes.SET_GLOBAL:
        log(
          `Setting global variables.\nprevious state:\t${stringify(
            global
          )}\nnext state:\t${stringify(variables)}`
        );
        global = variables;
        stageInfo.result = setStageResult(stageResults.SUCCESS);

        break;
      case stageTypes.CRUD:
        let path = "";
        let response = null;
        const model = request.type.toLowerCase();
        const configuration = mergeConfigs(global?.config, request?.config);

        // Replace path with global values
        if (request.path) {
          path = await replacer(request.path);
        }
        const url = `${global?.baseUrl ?? ""}${path}`;

        // Replace config with global values
        const config = {};
        if (configuration) {
          const keys = Object.keys(configuration);
          if (keys.length) {
            await forEachSeries(keys, async (key) => {
              config[key] = await replacer(configuration[key]);
            });
          }
        }

        if (model === "delete" || model === "get") {
          log(
            `Doing crud of type:\t${model}\nto:\t${url}\nwith config:\t${stringify(
              config
            )}`
          );
          try {
            response = await axios[request.type.toLowerCase()](url, config);
          } catch (error) {
            response = {
              status: error.response.status,
              config: error.config,
            };
          }
        } else {
          // Replace data with global values
          const data = Array.isArray(request?.data) ? [] : {};
          if (request?.data) {
            const keys = Object.keys(request.data);
            if (keys.length) {
              await forEachSeries(keys, async (key) => {
                data[key] = await replacer(request.data[key]);
              });
            }
          }

          log(
            `Doing crud of type:\t${model}\nto:\t${url}\nwith config:\t${stringify(
              config
            )}\nwith data:\t${stringify(data)}`
          );

          try {
            response = await axios[request.type.toLowerCase()](
              url,
              stringify(data),
              config
            );
          } catch (error) {
            response = {
              status: error.response.status,
              config: error.config,
            };
          }
        }

        const responseStatus = response?.status ?? 0;
        if (
          result.allow.includes(responseStatus) ||
          result.allow.includes("*")
        ) {
          log(
            `Return success:\t${stringify({
              status: response.status,
              headers: response.headers,
              config: response.config,
              data: response.data,
            })}`
          );
          stageInfo.result = setStageResult(stageResults.SUCCESS);
        } else if (
          result.deny.includes(responseStatus) ||
          result.deny.includes("*")
        ) {
          log(
            `Return failed:\t${stringify({
              status: response.status,
              config: response.config,
            })}`
          );
          stageInfo.result = setStageResult(stageResults.FAIL);
        } else stageInfo.result = setStageResult(stageResults.UNDEFINED);

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
  console.info(
    `${
      !stopFlag
        ? "PIPELINE FINISHED WITH SUCCESS"
        : "PIPELINE FINISHED WITH ERRORS"
    }`
  );
  console.info(`Log file written in ${resolve(logPath)}`);
  console.info(`Result file written in ${resolve(resultPath)}`);
};

module.exports.test = t;
