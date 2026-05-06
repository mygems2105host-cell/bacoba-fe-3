
 interface BillProduct {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  salePrice: number;
  total: number;
  status: string;
  [key:string]:any;
}

export interface Bill {
  id: string;
  exchange?: Bill | null;
  name?: string | null;
  customerName?: string | null;
  phoneNumber?: string | null;
  discount: number;
  total: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  billProducts?: BillProduct[];
  [key:string]:any;
}

export type CreateBillInput = Omit<Bill, "id" | "createdAt" | "updatedAt" | "exchange" | "exchangedBy" | "billProducts">;
export type UpdateBillInput = Partial<Omit<Bill, "id" | "createdAt" | "updatedAt" | "exchange" | "exchangedBy" | "billProducts">>;

export const MOCK_BILLS: Bill[] = [
  {
    id: "BILL-2024-001",
    name: "Hóa đơn bán lẻ - Khách vãng lai",
    customerName: "Nguyễn Văn A",
    phoneNumber: "0901234567",
    discount: 50000,
    total: 1300000,
    status: "active",
    createdAt: new Date("2024-03-20T08:00:00Z"),
    updatedAt: new Date("2024-03-20T09:30:00Z"),
    billProducts: [
      {
        id: "BP-001",
        productId: "QB11",
        productName: "Quần bò Baggy Nam ống rộng",
        quantity: 2,
        salePrice: 450000,
        total: 900000,
        status: "active",
      },
      {
        id: "BP-002",
        productId: "QB11-1",
        productName: "Quần bò Baggy Nam ống rộng-Đỏ-XL",
        quantity: 1,
        salePrice: 450000,
        total: 450000,
        status: "active",
      },
    ],
  },
  {
    id: "BILL-2024-002",
    name: "Đơn hàng Website",
    customerName: "Trần Thị B",
    phoneNumber: "0912345678",
    discount: 20000,
    total: 1580000,
    status: "active",
    createdAt: new Date("2024-03-21T10:15:00Z"),
    updatedAt: new Date("2024-03-21T14:20:00Z"),
    billProducts: [
      {
        id: "BP-003",
        productId: "AP11",
        productName: "Áo phông Unisex Cotton 100%",
        quantity: 5,
        salePrice: 160000,
        total: 800000,
        status: "active",
      },
      {
        id: "BP-004",
        productId: "AP11-2",
        productName: "Áo phông Unisex Cotton 100%-Xanh dương-XL",
        quantity: 2,
        salePrice: 160000,
        total: 320000,
        status: "active",
      },
      {
        id: "BP-005",
        productId: "AP11-3",
        productName: "Áo phông Unisex Cotton 100%-Đỏ-M",
        quantity: 3,
        salePrice: 160000,
        total: 480000,
        status: "active",
      },
    ],
  },
  {
    id: "BILL-2024-003",
    name: "Đơn hàng tại quầy",
    customerName: "Lê Văn C",
    phoneNumber: "0988888888",
    discount: 100000,
    total: 1060000,
    status: "active",
    createdAt: new Date("2024-03-22T08:45:00Z"),
    updatedAt: new Date("2024-03-22T09:00:00Z"),
    billProducts: [
      {
        id: "BP-006",
        productId: "VH11",
        productName: "Váy hoa nhí Vintage dáng dài",
        quantity: 1,
        salePrice: 580000,
        total: 580000,
        status: "active",
      },
      {
        id: "BP-007",
        productId: "VH11-2",
        productName: "Váy hoa nhí Vintage dáng dài-Xanh dương-S",
        quantity: 1,
        salePrice: 580000,
        total: 580000,
        status: "active",
      },
    ],
  },
  {
    id: "BILL-2024-004",
    name: "Đơn hàng sỉ (Gốc)",
    customerName: "Phạm Minh D",
    phoneNumber: "0977666555",
    discount: 500000,
    total: 2580000,
    status: "returned", // Trạng thái đã chuyển sang trả hàng
    createdAt: new Date("2024-03-23T10:00:00Z"),
    updatedAt: new Date("2026-04-20T11:00:00Z"), // Ngày thực hiện đổi trả
    billProducts: [
      {
        id: "BP-008",
        productId: "AP11",
        productName: "Áo phông Unisex Cotton 100%",
        quantity: 10,
        salePrice: 160000,
        total: 1600000,
        status: "returned",
      },
      {
        id: "BP-009",
        productId: "QB11-2",
        productName: "Quần bò Baggy Nam ống rộng-Xanh dương-XL",
        quantity: 2,
        salePrice: 450000,
        total: 900000,
        status: "returned",
      }
    ],
  },
  {
    id: "BILL-2024-005",
    name: "Đơn đổi hàng từ BILL-2024-004",
    customerName: "Phạm Minh D",
    phoneNumber: "0977666555",
    discount: 500000,
    // Total = (BP-008: 1.6M + BP-009: 900K + BP-010: 580K) - 500K = 2.580.000 + 580.000 = 3.160.000
    total: 2580000, 
    status: "active",
    createdAt: new Date("2026-04-20T11:05:00Z"),
    updatedAt: new Date("2026-04-20T11:05:00Z"),
    billProducts: [
      {
        id: "BP-008",
        productId: "AP11",
        productName: "Áo phông Unisex Cotton 100%",
        quantity: 10,
        salePrice: 160000,
        total: 1600000,
        status: "active",
      },
      {
        id: "BP-009",
        productId: "QB11-2",
        productName: "Quần bò Baggy Nam ống rộng-Xanh dương-XL",
        quantity: 2,
        salePrice: 450000,
        total: 900000,
        status: "active",
      },
      {
        id: "BP-010",
        productId: "VH11-3",
        productName: "Váy hoa nhí Vintage dáng dài-Đỏ-M",
        quantity: 1,
        salePrice: 580000,
        total: 580000,
        status: "active",
      },
    ],
  },
];
