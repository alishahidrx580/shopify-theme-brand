#!/bin/bash
# Interleaved A/B so machine-load drift hits every arm equally.
URL="https://theeditpk.com/products/brightening-face-mask"
COMMON="--only-categories=performance --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --output=json --chrome-flags=--headless=new,--no-sandbox --max-wait-for-load=60000"
for i in 1 2 3; do
  npx -y lighthouse@12 "$URL" $COMMON --output-path="seo-reports/ab/base-$i.json" > /dev/null 2>&1
  npx -y lighthouse@12 "$URL" $COMMON --blocked-url-patterns="*judgeme*" --blocked-url-patterns="*judge.me*" --blocked-url-patterns="*jdgm*" --output-path="seo-reports/ab/nojm-$i.json" > /dev/null 2>&1
  npx -y lighthouse@12 "$URL" $COMMON --blocked-url-patterns="*gsc-instafeed*" --blocked-url-patterns="*getsitecontrol*" --blocked-url-patterns="*gsc-instagram*" --output-path="seo-reports/ab/noig-$i.json" > /dev/null 2>&1
  echo "round $i done"
done
echo ALLDONE
