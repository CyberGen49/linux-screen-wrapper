#!/bin/bash
screen-wrapper-source "$@"
if [ -f ~/screen-wrapper-exec ]; then
  ~/screen-wrapper-exec
  rm -f ~/screen-wrapper-exec
fi