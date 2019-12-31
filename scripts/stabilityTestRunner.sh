echo '\n\n*********************UI Auto must set Env*******************************'
echo '*               BASE_URL:' $BASE_URL
echo '*             USER_TOKEN:' $USER_TOKEN
echo '*             JENKINSURL:' $JENKINSURL
echo '*              TESTIMAGE:' $TESTIMAGE
echo '*              TEST_TIME:' $TEST_TIME
echo '*'
echo '*             EMAIL_HOST: ' $EMAIL_HOST
echo '*             EMAIL_PORT: ' $EMAIL_PORT
echo '*             EMAIL_USER: ' $EMAIL_USER
echo '*         EMAIL_PASSWORD: ' $EMAIL_PASSWORD
echo '*             EMAIL_FROM: ' $EMAIL_FROM
echo '*               EMAIL_TO: ' $EMAIL_TO
echo '*'
echo '*          DING_DING_URL: ' $DING_DING_URL
echo '* DING_DING_ACCESS_TOKEN: ' $DING_DING_ACCESS_TOKEN
echo '************************************************************************\n\n'

suite=$1
rm -rf e2e-reports
startTime=$(date +%s)
while true
do
endTime=$(date +%s)
time=$[ $endTime - $startTime ]

if [ $time -lt $TEST_TIME ]
then
echo '\n\n测试已经运行了' $time '秒\n\n'
./node_modules/protractor/bin/protractor ./e2e/protractor.stability.conf.js --suite $suite
else
break
fi
done
node ./e2e/utility/common.email.js
echo "finished"
exit
