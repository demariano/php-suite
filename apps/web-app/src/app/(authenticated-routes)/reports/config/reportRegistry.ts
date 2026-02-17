import { Customers, File, Inventory, Products } from '@components-web/icons';
import IIcon from '@components-web/types/icons';
import { ReportTypeEnum } from '@data-access/types/report.types';

export type ReportFilterType =
    | 'list'
    | 'list-area-status'
    | 'date-range'
    | 'date-range-salestype'
    | 'date-range-invoice'
    | 'date-range-customer'
    | 'date-range-method'
    | 'date-range-payment'
    | 'date-range-rgs'
    | 'list-customer'
    | 'list-stock'
    | 'list-product'
    | 'date-range-voucher';

export interface ReportConfig {
    id: string;
    title: string;
    description: string;
    filterType: ReportFilterType;
    reportType: ReportTypeEnum;
    supportsSeparateByArea?: boolean;
    separateByAreaDefault?: boolean;
    supportsMultiArea?: boolean;
}

export interface ReportModuleConfig {
    id: string;
    label: string;
    icon: React.ElementType<IIcon>;
    reports: ReportConfig[];
}

export const REPORT_MODULES: ReportModuleConfig[] = [
    {
        id: 'customers',
        label: 'Customers',
        icon: Customers,
        reports: [
            {
                id: 'customer-list',
                title: 'Customer List Report',
                description: 'Complete list of customers with filters',
                filterType: 'list-customer',
                reportType: ReportTypeEnum.CUSTOMER_LIST,
                supportsSeparateByArea: true,
                separateByAreaDefault: false,
                supportsMultiArea: true,
            },
        ],
    },
    {
        id: 'invoicing',
        label: 'Invoicing',
        icon: File,
        reports: [
            {
                id: 'invoice-per-date-per-area',
                title: 'Invoice Per Date',
                description: 'Invoices grouped by area within a date range',
                filterType: 'date-range-invoice',
                reportType: ReportTypeEnum.INVOICE_PER_DATE_PER_AREA,
                supportsSeparateByArea: true,
                separateByAreaDefault: true,
                supportsMultiArea: true,
            },
        ],
    },
    {
        id: 'payments',
        label: 'Payments',
        icon: File,
        reports: [
            {
                id: 'payments-received',
                title: 'Payments Received Report',
                description: 'All payments received within date range',
                filterType: 'date-range-payment',
                reportType: ReportTypeEnum.PAYMENTS_RECEIVED,
                supportsSeparateByArea: true,
                separateByAreaDefault: true,
                supportsMultiArea: true,
            },
        ],
    },
    {
        id: 'return-goods-sold',
        label: 'Return Goods Sold',
        icon: File,
        reports: [
            {
                id: 'rgs-per-date',
                title: 'Return Goods Sold Per Date',
                description: 'Return goods sold within a specific date range',
                filterType: 'date-range-rgs',
                reportType: ReportTypeEnum.RGS_PER_DATE,
                supportsSeparateByArea: true,
                separateByAreaDefault: false,
                supportsMultiArea: true,
            },
        ],
    },
    {
        id: 'inventory',
        label: 'Inventory',
        icon: Inventory,
        reports: [
            {
                id: 'stock-list',
                title: 'Stock List Report',
                description: 'Complete list of stock items',
                filterType: 'list-stock',
                reportType: ReportTypeEnum.STOCK_LIST,
            },
        ],
    },
    {
        id: 'products',
        label: 'Products',
        icon: Products,
        reports: [
            {
                id: 'product-list',
                title: 'Product List Report',
                description: 'Complete list of products',
                filterType: 'list-product',
                reportType: ReportTypeEnum.PRODUCT_LIST,
            },
        ],
    },
    {
        id: 'accounting',
        label: 'Accounting',
        icon: File,
        reports: [
            {
                id: 'voucher-per-date',
                title: 'Voucher Report',
                description: 'Vouchers within a date range with optional customer, area, and account filters',
                filterType: 'date-range-voucher',
                reportType: ReportTypeEnum.VOUCHER_PER_DATE,
            },
        ],
    },
];
