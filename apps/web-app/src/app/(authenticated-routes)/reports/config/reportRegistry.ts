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
    | 'date-range-method';

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
                filterType: 'list-area-status',
                reportType: ReportTypeEnum.CUSTOMER_LIST,
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
                filterType: 'date-range-method',
                reportType: ReportTypeEnum.PAYMENTS_RECEIVED,
            },
            {
                id: 'outstanding-payments',
                title: 'Outstanding Payments',
                description: 'Unpaid and overdue invoices',
                filterType: 'date-range',
                reportType: ReportTypeEnum.OUTSTANDING_PAYMENTS,
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
                filterType: 'date-range',
                reportType: ReportTypeEnum.RGS_PER_DATE,
            },
            {
                id: 'rgs-per-date-per-customer',
                title: 'Return Goods Sold Per Date Per Customer',
                description: 'Return goods sold filtered by date range and customer',
                filterType: 'date-range-customer',
                reportType: ReportTypeEnum.RGS_PER_DATE_PER_CUSTOMER,
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
                filterType: 'list',
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
                filterType: 'list',
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
                title: 'Voucher Per Date',
                description: 'Vouchers within a specific date range',
                filterType: 'date-range',
                reportType: ReportTypeEnum.VOUCHER_PER_DATE,
            },
            {
                id: 'voucher-per-date-per-customer',
                title: 'Voucher Per Date Per Customer',
                description: 'Vouchers filtered by date range and customer',
                filterType: 'date-range-customer',
                reportType: ReportTypeEnum.VOUCHER_PER_DATE_PER_CUSTOMER,
            },
        ],
    },
];
