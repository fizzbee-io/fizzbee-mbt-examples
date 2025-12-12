# fizzbee-mbt-examples
Model-based testing examples for FizzBee

This repo contains various examples for model based testing with FizzBee.

To get started, see the [Quick Start](https://fizzbee.io/testing/tutorials/quick-start/) guide.

| Example                                                     | language | Description                                                                             |
|-------------------------------------------------------------|----------|-----------------------------------------------------------------------------------------|
| [fizzbee-mbt-quickstart](./examples/fizzbee-mbt-quickstart) | Go       | Final code from the fizzbee-mbt-quickstart Go guide including all exercises.            |
| [fizzbee-mbt-quickstart-java](./examples/fizzbee-mbt-quickstart-java) | Java     | Final code from the fizzbee-mbt-quickstart Java guide including all exercises.          |
| [fizzbee-mbt-quickstart-java](./examples/fizzbee-mbt-quickstart-rust) | Rust     | Final code from the fizzbee-mbt-quickstart Rust guide including all exercises.          |
| [buffered-writer](./examples/buffered-writer)               | Go       | Shows how non-deterministic choices in the spec are mapped to the SUT.                  |
| [embedded-kvstore](./examples/embedded-kvstore)             | Go, Rust | More realistic example, testing a non-linearizable kvstore database                     |
| [todo-app](./examples/todo-app)                             | Java, TypeScript     | UI testing for a [todo app](https://github.com/Horlerdipo/todo-golang) using playwright |

# Install FizzBee and FizzBee-MBT

FizzBee has two components: 
- the FizzBee model checker for validating the system design
- the FizzBee Model Based Testing (MBT) tool to test your implementation.

**On Mac with homebrew:**,
```bash
brew tap fizzbee-io/fizzbee
brew install fizzbee

brew tap fizzbee-io/fizzbee-mbt
brew install fizzbee-mbt
```
**Manual installation**

Alternatively, you can download and install them manually. You'll need both the FizzBee Model Checker and the FizzBee Model Based Testing binaries.

For FizzBee Model Checker, the binaries are available at,
https://github.com/fizzbee-io/fizzbee/releases

For FizzBee Model Based Testing, the binaries are available at,
https://github.com/fizzbee-io/fizzbee-mbt-releases/releases

Make sure to add both the un-tarred (`tar -xzf filename.tar.gz`) directories to your PATH.

# Generate the test skeleton
## Go
Run the scaffolding command to generate the test skeleton and the adapter code.
```bash
fizz mbt-scaffold  \
        --lang go \
        --go-package counter \
        --gen-adapter \
        --out-dir fizztests/ \
        specs/simple-counter/counter.fizz     # The path to the fizz spec file
```
Optionally, format the generated code with `go fmt` for consistent code style.
```bash
go fmt fizztests/*
```

This will generate 3 files under `fizztests` directory. 

| File                  | Description                                                    | Edit/Implement |
|-----------------------|----------------------------------------------------------------|----------------|
| counter_test.go       | The test starter code that can be started with `go test`.      | Do not edit    |
| counter_interfaces.go | The interfaces for the roles and actions defined in the model. | Do not edit    |
| counter_adapters.go   | The scaffolding for the adapter implementing the interface.    | Implement      |

## Java
Run the scaffolding command to generate the test skeleton and the adapter code.
```bash
fizz mbt-scaffold  \
        --lang java \
        --java-package org.example.counter \
        --gen-adapter \
        --out-dir fizztest/java \
        specs/simple-counter/counter.fizz     # The path to the fizz spec file
```
The [shared libraries are distributed via jitpack](https://jitpack.io/#fizzbee-io/fizzbee/).
For example in gradle,
```
	dependencies {
	        implementation 'com.github.fizzbee-io:fizzbee:v0.3.0'
	}
```
Look at the jitpack link for the latest version and the instructions for your build system.

## Rust
Run the scaffolding command to generate the test skeleton and the adapter code.
```bash
fizz mbt-scaffold  \
        --lang rust \
        --gen-adapter \
        --out-dir src/fizztests/ \
        specs/simple-counter/counter.fizz     # The path to the fizz spec file
