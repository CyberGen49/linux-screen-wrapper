# linux-screen-wrapper
A wrapper for the Linux `screen` command that adds friendly, coloured output and the ability to resume sessions with incomplete names.

This project is inspired by [hi94740/screen-command](https://github.com/hi94740/screen-command).

## Installation
To install the package using NPM:
```
npm i -g linux-screen-wrapper
```

## Usage
Once the package is installed, the `s` command is made available.

### `s ls`
Prints a list of all running screen sessions, including each session's PID, name, start date and time, and attached/detached status.

### `s r <name|PID>`
Attaches a screen session by its `name` or `PID` using screen's `-x` flag. This allows for a screen to be attached to multiple terminals at a time, as opposed to `-r`'s single-terminal limitation.

### `s c <name>`
Creates a new screen session with the given `name`. Equivalent to `screen -S name`.