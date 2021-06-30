<h1 align="center">
	🛠️ Pipe-Test
</h1>

<p align="center">
  <strong>
    Make REST API testing easy with a JSON file pipeline
  </strong>
</p>

<p align="center">
  A simple command-line endpoint testing library made entirely out of JavaScript
</p>

<p align="center">
	<a href="#about">About</a> •
	<a href="#installation">Installation</a> •
	<a href="#usage">Usage</a> •
	<a href="#authors">Authors</a> •
	<a href="#license">License</a>
</p>

# About

Execute endpoint tests with a simple JSON file.

Pipe-test is an automatic testing solution for REST APIs, easy to configure and easy to use.

# Installation

Use your favorite JavaScript package manager!

```bash
$ npm install @danilo_pereira/pipe-test

$ yarn add @danilo_pereira/pipe-test
```

## Dependencies

Likewise, the `p-iteration` dependency must be installed manually for the project to work.

```
$ npm install p-iteration

$ yarn add p-iteration
```

# Usage

After installed, the `pipe-test` command will be available. The command accepts 2 arguments, both of which must be valid JSON files:

1. The pipeline file
2. The configuration file (optional)

```
pipe-test pipeline.json options.json
```

If no configuration file is provided, the [default configuration](./options.json) will be used.

## 🔩 The pipeline

The pipeline consists of a JSON file with a single array that contains the test objects, and each object represents a stage in the test pipeline.

Below is a table description of the valid JSON properties and how each one works.

| Attribute   | Requirement                                                  | Default | Options          | Description                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------ | ------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| description | optional                                                     | -       | -                | String field that describes the test, meant for organizational and understanding purposes                                                                                                                                                               |
| type        | **at least one SET_GLOBAL required in the pipeline**                         | CRUD    | SET_GLOBAL, CRUD | **SET_GLOBAL** => Overwrites the global variable, mandatory at the beginning of the pipeline to set the base URL, header configurations and any initial global values <br /> **CRUD** => Default value, used to indicate a REST request   |
| request     | **required**                                                 | -       | -                | Request object, structured as shown [here](#request)                                                                                                                                                                                                        |
| result      | **required**                                                 | -       | -                | Object with **allow** and **deny** integer array properties that define the valid response statuses for the test to be considered a success or a fail.<br />While **allow** is always required, **deny** is also required, except in case of the asterisk operator (\*) in **allow**. See the correct structure [here](#result)                                                                                          |
| funcs       | optional                                                     | -       | -                | Array of strings that contain JavaScript code that will be executed in an eval function if the test passes. Useful for manipulating the global variable e.g. adding a new field with the request's result data to be used in a later request. [See an example](#funcs)    |
| variables   | **exclusive to SET_GLOBAL, optional but highly recommended** | -       | -                | Object that **overwrites** the global variable, with a **baseUrl** property used to define the base URL used for every request on the pipeline. If no baseUrl is provided, all individual request paths will need to contain <ins>the complete URL</ins> |

## 🌎 Global variables

A global variable is available to use throughout the pipeline, to facilitate the use of common values in multiple requests, such as an id. The global variable consists of a JavaScript object with any properties, each property being a global value in it of itself:

```javascript
const global = {
  name: "Lorem Ipsum",
  age: 40,
}
```

In order to access these values in the pipeline, you must use `$global.<property>` e.g. `$global.name`.

**Only the following pipeline properties able to replace global values: <ins>path</ins>, <ins>config</ins> and <ins>data</ins>.**

## 🏗️ Object structures
### Request
```json
"request": {
  "type": "GET",
  "path": "/user/$global.user_id",
  "config": {
    "headers": {
      "Authorization": "$global.user_token"
    }
  },
  "data": {}
}
```
### Result
```json
"result": {
  "allow": [
    200,
    404
  ],
  "deny": [
    "*"
  ]
}
```
```json
"result": {
  "allow": [
    "*"
  ]
}
```
### Funcs
```json
"funcs": [
  "if (response.status === 200) global = {...global, user_token: response.data};"
]
```

## Example
```json
{
  "description":"Perform user login",
  "type":"CRUD",
  "request":{
    "type":"POST",
    "path":"/login",
    "data":{
      "username": "$global.user_email",
      "password": "$global.user_password"
    }
  },
  "result":{
    "allow":[
      200
    ],
    "deny":[
      "*"
    ]
  },
  "funcs":[
    "if (response.status === 200) global = {...global, user_id: response.data.id, user_photo: response.data.photo};"
  ]
}
```

## ⚙️ Custom Configuration

The configuration file is a simple JSON with the following properties:

- **delay** => Milliseconds to wait between the execution of each individual test
- **path** => By default, the output files are generated in the same directory where the command was executed. Therfore, use this property if you would like to change the output path. Don't worry, if the provided output directory does not exist, it will be created.

> <ins>**Note</ins>:** In order for the files to be created correctly in the desired directory, you must add a forward slash at the end of the path, e.g. `"./output/"`

- **name_mode** => One of two values, `"BY_DATE"` or `"CUSTOM"`
  - BY_DATE => Default value, saves both JSON and log output files with the ISO 8601 date/time format i.e. `"YYYY-MM-DDThh:mm:ss"`, e.g `2021-06-22T14:00:00.json`. Because of this, this option creates 2 new output files on each execution
  - CUSTOM => Saves output files with a custom name, provided by the **name** property. <ins>With this option, the log file appends new content and the JSON file is overwritten on each new execution</ins>
- **name** => Custom output file name (the same name will be used for both JSON and log files).

> <ins>**Note</ins>:** This name will only be considered if **name_mode** is `"CUSTOM"`

# Authors

<table>
  <tr>
    <td align="center"><a href="https://www.linkedin.com/in/danilojpferreira/"><img style="border-radius: 50%;" height="auto" width="150px" src="https://avatars.githubusercontent.com/u/43321038?v=4"><br /><p><b>Danilo Pereira</b></p></a><p>Author</p></td>
    <td align="center"><a href="https://www.linkedin.com/in/leticia-vigna/"><img style="border-radius: 50%;" height="auto" width="150px" src="https://avatars.githubusercontent.com/u/41032355?v=4"><br /><p><b>Letícia Vigna</b></p></a><p>Co-Author</p></td>
  </tr>
</table>

# License

This project is under the [GNU General Public License](./LICENSE).

---

Made by [Letícia Vigna](https://www.linkedin.com/in/leticia-vigna).
