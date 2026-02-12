const fs = require('fs');
const f = 'apps/web-app/src/app/(authenticated-routes)/invoicing/payment/[id]/edit/components/PaymentDetailsTab.tsx';
let c = fs.readFileSync(f, 'utf8');
const old = "chequeDate: '',\n            bankName: '',\n            paymentType: PaymentTypeEnum.CASH,";
const nw =
    "chequeDate: '',\n            bankName: '',\n            bankAccountNo: '',\n            paymentType: PaymentTypeEnum.CASH,";
const count = c.split(old).length - 1;
c = c.split(old).join(nw);
fs.writeFileSync(f, c);
console.log('Replaced', count, 'instances');
