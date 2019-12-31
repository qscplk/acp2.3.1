#!/bin/bash
# 在项目根目录运行此脚本，手动下载e2e依赖。
# 根据需要改动以下变量
chrome_driver_mirror=https://npm.taobao.org/mirrors/chromedriver
selenium_dir=./node_modules/webdriver-manager/selenium
version=2.44

unameOut="$(uname -s)"
case "${unameOut}" in
    Linux*)     ARCH=linux64;;
    Darwin*)    ARCH=mac64;;
    *)          ARCH=linux64;;
esac

rm -rf ${selenium_dir}
mkdir ${selenium_dir}
echo ">>> Downloading ChromeDriver from ${chrome_driver_mirror}"
echo "    version: ${version}, Arch: ${ARCH}"
curl -L ${chrome_driver_mirror}/${version}/chromedriver_${ARCH}.zip  \
  --output ${selenium_dir}/chromedriver_${version}.zip
echo '>>> Unzipping'
unzip ${selenium_dir}/chromedriver_${version}.zip -d ${selenium_dir}
cp -f ./scripts/update-config.json ${selenium_dir}
