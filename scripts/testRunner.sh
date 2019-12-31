rm -rf ./protractorFailuresReport
rm -rf ./e2e-reports
suite=$1
if [ $# == 0 ]; then
    ./node_modules/protractor/bin/protractor ./e2e/protractor.headless.conf.js
else
    ./node_modules/protractor/bin/protractor ./e2e/protractor.headless.conf.js --suite $suite
fi