#!/bin/sh

if [ $# -eq 0 ] ; then
  truffle migrate --reset | tee -a $LOG_FILE
else
  truffle migrate --reset --network $1 | tee -a $LOG_FILE
fi
