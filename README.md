<h1 align="center">
	Pipe-Test
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
	<a href="#how-it-works">How it works</a> •
	<a href="#author">Author</a> •
	<a href="#license">License</a> •
	<a href="#languages">Languages</a>
</p>

## About

🛠️ Execute endpoint tests with a simple JSON file.

Pipe-test is an automatic testing solution for REST APIs, easy to configure and easy to use.

## Installation

Use your favorite JavaScript package manager!

NPM

```
$ npm install @danilo_pereira/pipe-test
```

Yarn

```
$ yarn add @danilo_pereira/pipe-test
```

### Dependencies

Likewise, the `p-iteration` dependency must be installed manually for the project to work.

NPM

```
$ npm install p-iteration
```

Yarn

```
$ yarn add p-iteration
```

## Usage

After installed, the `pipe-test` command will be available. The command accepts 2 arguments, both of which mus tbe valid JSON files:

1. The pipeline file
2. The configuration file (optional)

```
pipe-test pipeline.json options.json
```

If no configuration file is provided, the [default configuration](./options.json) will be used.

### ⚙️ Custom Configuration

The configuration file is a simple JSON with the following attributes:

- **delay** => Milliseconds to wait between the execution of each individual test
- **path** => By default, the output files are generated in the same directory where the command was executed. Therfore, use this attribute if you would like to change the output path. Don't worry, if the provided output directory does not exist, it will be created.

> <ins>**Note</ins>:** In order for the files to be created correctly in the desired directory, you must add a forward slash at the end of the path, e.g. `"./output/"`

- **name_mode** => One of two values, `"BY_DATE"` or `"CUSTOM"`
  - BY_DATE => Default value, saves both JSON and log output files with the ISO 8601 date/time format i.e. `"YYYY-MM-DDThh:mm:ss"`, e.g `2021-06-22T14:00:00.json`. Because of this, this option creates 2 new output files on each execution
  - CUSTOM => Saves output files with a custom name, provided by the **name** attribute. <ins>With this option, the log file appends new content and the JSON file is overwritten on each new execution</ins>
- **name** => Custom output file name (the same name will be used for both JSON and log files).

> <ins>**Note</ins>:** This name will only be considered if **name_mode** is `"CUSTOM"`

### 🔩 The pipeline

The pipeline consists of a JSON file with a single array that contains the test objects, and each object represents a stage in the test pipeline.

| Attribute   | Requirement                          | Default | Options          | Description                                                                                                                                                                                                                                    |
| ----------- | ------------------------------------ | ------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| description | optional                             | -       | -                | Field that describes the test, meant for organizational and understanding purposes                                                                                                                                                             |
| type        | **at least one SET_GLOBAL required** | CRUD    | SET_GLOBAL, CRUD | **SET_GLOBAL** => Overwrites the global variable, mandatory at the beginning of the pipeline to set the destination URL, header configurations and any initial global values <br /> **CRUD** => Default value, used to indicate a REST request |
| request     | **required**                         | -       | -                | Request object, structured as show below                                                                                                                                                                                                       |
| result      | **required**                         | -       | -                | Object with **allow** and **deny** attributes that define the valid response statuses for the test to be considered a success or a fail                                                                                                        |

## Author

[![Twitter Badge](https://img.shields.io/badge/-@tgmarinho-1ca0f1?style=flat-square&labelColor=1ca0f1&logo=twitter&logoColor=white&link=https://twitter.com/tgmarinho)](https://twitter.com/tgmarinho) [![Linkedin Badge](https://img.shields.io/badge/-Thiago-blue?style=flat-square&logo=Linkedin&logoColor=white&link=https://www.linkedin.com/in/danilojpferreira)](https://www.linkedin.com/in/tgmarinho/) [![Gmail Badge](https://img.shields.io/badge/-tgmarinho@gmail.com-c14438?style=flat-square&logo=Gmail&logoColor=white&link=mailto:tgmarinho@gmail.com)](mailto:tgmarinho@gmail.com)

## License

This project is under the [GNU General Public License](./LICENSE).

## Languages

[Brazilian Portuguese](./README-PT.md) | [English](./README.md)

---

Made by [Letícia Vigna](https://www.linkedin.com/in/leticia-vigna).
