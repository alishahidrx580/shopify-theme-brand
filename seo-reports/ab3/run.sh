#!/bin/bash
COMMON="--only-categories=performance --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --output=json --chrome-flags=--headless=new,--no-sandbox --max-wait-for-load=60000"
for i in 1 2 3 4; do
  npx -y lighthouse@12 "https://theeditpk.com/products/brightening-face-mask?cb=livea$i" $COMMON --output-path="seo-reports/ab3/live-$i.json" > /dev/null 2>&1
  npx -y lighthouse@12 "https://theeditpk.com/products/brightening-face-mask?preview_theme_id=190120624356&cb=guarda$i" $COMMON --output-path="seo-reports/ab3/guard-$i.json" > /dev/null 2>&1
  echo "round $i done"
done
echo ALLDONE
