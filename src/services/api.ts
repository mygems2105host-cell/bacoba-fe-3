import type {
  Attribute,
  AttributeType,
  Bill,
  BillProduct,
  Product,
  ProductType,
  Provider,
} from "@/types";
import type { HistoryProvider } from "@/types/HistoryProvider";
import type { ReceivedNote } from "@/types/ReceivedNote";
import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";

// Sử dụng path relative trong development (proxy sẽ xử lý)
// Sử dụng environment variable trong production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

// Tạo axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    'ngrok-skip-browser-warning': '69420',
  },
});

// Interceptor: Thêm token vào header trước khi gửi request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor: Xử lý response từ server
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Nếu token hết hạn (401), xóa token và redirect về login
    if (error.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export interface GetProductsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  brandId?: number | string;
  typeId?: number | string;
  attribute?: number | string;
  status?: string;
  order?: Record<string, "asc" | "desc">;
}

export interface ProductsApiResponse {
  success: boolean;
  message: string;
  data: Product[];
  meta?: {
    totalItems: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  };
}

export const getProducts = async (params?: GetProductsParams) => {
  try {
    const response = await apiClient.get<ProductsApiResponse>("/products", {
      params
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

export const getSearchedProducts = async (params?: GetProductsParams) => {
  try {
    const response = await apiClient.get<ProductsApiResponse>("/products/search-list", {
      params
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};


export interface ProductAttribute {
  id: string;
  value: string;
}

export interface CreateProductParams {
  prefix?: string;
  name: string;
  productTypeId: string;
  brandId: string;
  initialPrice: number;
  salePrice: number;
  description: string;
  attributes: ProductAttribute[][];
}

export interface EditProductParams {
  name: string;
  productTypeId: string;
  brandId: string;
  initialPrice: number;
  salePrice: number;
  description: string;
  status: string;
}

export const createProduct = async (params?: CreateProductParams) => {
  try {
    const response = await apiClient.post<ProductsApiResponse>(
      "/products",
      params
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

// Thêm id vào interface hoặc sử dụng intersection type
// Sửa tại file api service
export const editProduct = async (id: string, params: Partial<EditProductParams>) => {
  try {
    const response = await apiClient.put<ProductsApiResponse>(
      `/products/${id}`,
      params
    );
    return response.data;
  } catch (error) {
    console.error("Error editing product:", error);
    throw error;
  }
};

export interface RenameProductParams {
  name: string;
}

/**
 * Đổi tên sản phẩm
 * @param id ID của sản phẩm (ví dụ: AKG000005)
 * @param name Tên mới của sản phẩm
 */
export const renameProduct = async (id: string, name: string) => {
  try {
    const response = await apiClient.put<ProductsApiResponse>(
      `/products/${id}/rename`,
      { name } // Body gửi lên theo dạng { "name": "..." }
    );
    return response.data;
  } catch (error) {
    console.error(`Error renaming product with ID ${id}:`, error);
    throw error;
  }
};


/**
 * Thêm biến thể mới dựa trên danh sách thuộc tính được chọn
 * URL: POST /products/{id}/variants
 */
export const addVariantsToProduct = async (productId: string | number, attributes: { id: number; attributeTypeId: number; value: string }[]) => {
  try {
    const response = await apiClient.post(
      `/products/${productId}/variants`,
      attributes // Gửi mảng phẳng theo đúng hình ảnh Postman
    );
    return response.data;
  } catch (error) {
    console.error(`Lỗi khi thêm biến thể cho sản phẩm ${productId}:`, error);
    throw error;
  }
};

// product Type
export interface ProductTypesApiResponse {
  success: boolean;
  message: string;
  data: ProductType[];
}

export interface CreateProductTypes {
  name: string;
}

export const getProductTypes = async () => {
  try {
    const response = await apiClient.get<ProductTypesApiResponse>(
      "/product-types"
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

export const createProductType = async (params: CreateProductTypes) => {
  try {
    const response = await apiClient.post<ProductTypesApiResponse>(
      "/product-types",
      params
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

export const editProductType = async (
  id: string,
  params: CreateProductTypes
) => {
  try {
    const response = await apiClient.put<ProductTypesApiResponse>(
      `/product-types/${id}`,
      params
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

// attributeTypes
export interface AttributeTypesApiResponse {
  success: boolean;
  message: string;
  data: AttributeType[];
}
export interface CreateAttributeTypes {
  name: string;
}

export const createAttributeType = async (params: CreateAttributeTypes) => {
  try {
    const response = await apiClient.post<AttributeTypesApiResponse>(
      "/attribute-types",
      params
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

export const getAttributeTypes = async () => {
  try {
    const response = await apiClient.get<AttributeTypesApiResponse>(
      "/attribute-types"
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

export const editAttributeType = async (
  id: string,
  params: CreateAttributeTypes
) => {
  try {
    const response = await apiClient.put<ProductTypesApiResponse>(
      `/attribute-types/${id}`,
      params
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

// attribute
export interface AttributesApiResponse {
  success: boolean;
  message: string;
  data: Attribute[];
}

export const getAttributes = async () => {
  try {
    const response = await apiClient.get<AttributesApiResponse>("/attributes");
    return response.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};
export interface CreateAttributeApiResponse {
  success: boolean;
  message: string;
  data: Attribute;
}

export const createAttribute = async (data: CreateAttributeInput) => {
  try {
    const response = await apiClient.post<CreateAttributeApiResponse>("/attributes", data);
    return response.data;
  } catch (error) {
    console.error("Error creating attribute:", error);
    throw error;
  }
};

export type CreateAttributeInput = {
  attributeTypeId: string | number;
  value: string;
  status?: string; // Optional tùy theo logic backend của bạn
};

// received-notes
export interface ReceivedNotesApiResponse {
  success: boolean;
  message: string;
  data: ReceivedNote[];
  meta: {
    totalItems: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
    order?: Record<string, "asc" | "desc">;
  };
}

export interface ReceivedProductItem {
  productId: string;
  addQuantity: number;
  discount: number;
  description: string;
  total: number;
}

export interface CreateReceivedNoteParams {
  providerId: string;
  phoneNumber: string;
  description: string;
  discount: number;
  payedMoney: number;
  debtMoney: number;
  total: number;
  status: "confirm" | "draft" | "cancelled";
  receivedProducts: ReceivedProductItem[];
}

export const getReceivedNotes = async (params?: GetProductsParams) => {
  try {
    // Đổi AttributesApiResponse thành ReceivedNotesApiResponse
    const response = await apiClient.get<ReceivedNotesApiResponse>(
      "/received-notes",
      { params }
    );
    return response.data;
  } catch (error) {
    // Cập nhật log lỗi cho đúng ngữ cảnh (Received Notes thay vì Products)
    console.error("Error fetching received notes:", error);
    throw error;
  }
};

export const createReceivedNote = async (params: CreateReceivedNoteParams) => {
  try {
    const response = await apiClient.post<ReceivedNotesApiResponse>(
      "/received-notes",
      params
    );
    return response.data;
  } catch (error) {
    console.error("Error creating received note:", error);
    throw error;
  }
};

export const confirmReceivedNote = async (id:string) => {
  try {
    const response = await apiClient.put<ReceivedNotesApiResponse>(
      `/received-notes/${id}/confirm`
    );
    return response.data;
  } catch (error) {
    console.error("Error confirm received note:", error);
    throw error;
  }
};

export const cancelReceivedNote = async (id:string) => {
  try {
    const response = await apiClient.put<ReceivedNotesApiResponse>(
      `/received-notes/${id}/cancelled`
    );
    return response.data;
  } catch (error) {
    console.error("Error cancel received note:", error);
    throw error;
  }
};
/**
 * Cập nhật thông tin phiếu nhập (Ví dụ: sửa số lượng do đếm sai)
 * @param id ID của phiếu nhập cần sửa
 * @param params Dữ liệu hiệu chỉnh (tương tự mẫu JSON bạn cung cấp)
 */
export const editReceivedNote = async (id: string | number, params: CreateReceivedNoteParams) => {
  try {
    const response = await apiClient.put<ReceivedNotesApiResponse>(
      `/received-notes/${id}`,
      params
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating received note with ID ${id}:`, error);
    throw error;
  }
};

// Provider
export interface ProvidersApiResponse {
  success: boolean;
  message: string;
  data: Provider[];
  meta: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreateProvidersParams {
  name: string;
  phoneNumber?: string | null;
  email?: string | null;
  status: "active" | "inactive";
  debtTotal: number;
  total: number;
}

export const getProviders = async (params?: GetProductsParams) => {
  try {
    // Đổi AttributesApiResponse thành ReceivedNotesApiResponse
    const response = await apiClient.get<ProvidersApiResponse>("/providers", {
      params,
    });
    return response.data;
  } catch (error) {
    // Cập nhật log lỗi cho đúng ngữ cảnh (Received Notes thay vì Products)
    console.error("Error fetching provider :", error);
    throw error;
  }
};

export const createProviders = async (params?: CreateProvidersParams) => {
  try {
    // Đổi AttributesApiResponse thành ReceivedNotesApiResponse
    const response = await apiClient.post<ProvidersApiResponse>(
      "/providers",
      params
    );
    return response.data;
  } catch (error) {
    // Cập nhật log lỗi cho đúng ngữ cảnh (Received Notes thay vì Products)
    console.error("Error create  provider:", error);
    throw error;
  }
};

export const editProviders = async (
  id: string,
  params: CreateProvidersParams
) => {
  try {
    const response = await apiClient.put<ProductTypesApiResponse>(
      `/providers/${id}`,
      params
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching provider:", error);
    throw error;
  }
};

// History Provider
export interface HistoryProvidersApiResponse {
  success: boolean;
  message: string;
  data: HistoryProvider[];
}

export interface CreateHistoryProvidersParams {
  providerId: string;
  paidAmount: number;
  description?: string | null;
  status?: "completed" | "pending" | "cancelled";
}

export const getHistoryProviders = async () => {
  try {
    const response = await apiClient.get<HistoryProvidersApiResponse>(
      "/history-providers"
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching history providers:", error);
    throw error;
  }
};

export const createHistoryProviders = async (
  params: CreateHistoryProvidersParams
) => {
  try {
    const response = await apiClient.post<HistoryProvidersApiResponse>(
      "/history-providers",
      params
    );
    return response.data;
  } catch (error) {
    console.error("Error creating history provider:", error);
    throw error;
  }
};

export const editHistoryProviders = async (
  id: string,
  params: CreateHistoryProvidersParams
) => {
  try {
    const response = await apiClient.put<HistoryProvidersApiResponse>(
      `/history-providers/${id}`,
      params
    );
    return response.data;
  } catch (error) {
    console.error("Error updating history provider:", error);
    throw error;
  }
};

export const cancelHistoryProviders = async (
  id: string
) => {
  try {
    const response = await apiClient.delete<HistoryProvidersApiResponse>(
      `/history-providers/${id}`
    );
    return response.data;
  } catch (error) {
    console.error("Error updating history provider:", error);
    throw error;
  }
};

export interface BillsApiResponse {
  success: boolean;
  message: string;
  data: Bill[];
  meta: {
    totalItems: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface CreateBillProductParam {
  productId: string;
  quantity: number;
  salePrice: number;
  total: number;
}

export interface CreateBillParams {
  name: string;
  customerName: string;
  phoneNumber: string;
  discount: number;
  total: number;
  status: string;
  billProducts: CreateBillProductParam[];
}

export interface CreateBillResponse {
  success: boolean;
  message: string;
  data: any; // Thay any bằng interface Bill nếu bạn đã định nghĩa
}

export const getBills = async (params?: GetProductsParams) => {
  try {
    // Đổi AttributesApiResponse thành ReceivedNotesApiResponse
    const response = await apiClient.get<BillsApiResponse>("/bills", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching bills :", error);
    throw error;
  }
};

export const createBill = async (data: CreateBillParams) => {
  try {
    const response = await apiClient.post<CreateBillResponse>("/bills", data);
    return response.data;
  } catch (error) {
    console.error("Error creating bill:", error);
    throw error;
  }
};

export const returnBill = async (id: string) => {
  try {
    // 1. Sửa lại đường dẫn (URL) khớp với Postman: /bills/{id}/return
    // 2. Nếu không có body, ta truyền một object rỗng {} hoặc null tùy vào cấu hình của apiClient
    const response = await apiClient.post<CreateBillResponse>(`/bills/${id}/return`, {});
    
    return response.data;
  } catch (error) {
    // Cập nhật lại log lỗi cho đúng ngữ cảnh là "hoàn trả" hóa đơn
    console.error(`Error returning bill with ID ${id}:`, error);
    throw error;
  }
};

// Thêm vào file api.ts

export interface ExchangeBillParams {
  discount: number;
  total: number;
  billProducts: {
    productId: string;
    productName: string;
    quantity: number;
    salePrice: number;
    total: number;
  }[];
}

/**
 * Gọi API đổi hàng
 * URL: POST /bills/{id}/exchange
 */
export const exchangeBill = async (id: string | number, params: ExchangeBillParams) => {
  try {
    const response = await apiClient.post<BillsApiResponse>(
      `/bills/${id}/exchange`,
      params
    );
    return response.data;
  } catch (error) {
    console.error(`Error exchanging bill with ID ${id}:`, error);
    throw error;
  }
};

// Thêm vào file api.ts

export interface EditBillParams {
  name: string;
  customerName: string;
  phoneNumber: string;
  discount: number;
  total: number;
  createdAt?: string;
  note?:string
  status: string;
  billProducts: CreateBillProductParam[];
}


/**
 * Cập nhật thông tin hóa đơn
 * URL: PUT /bills/{id}
 */
export const updateBill = async (billId: string | number, data: EditBillParams) => {
  try {
    const response = await apiClient.put<CreateBillResponse>(
      `/bills/${billId}`,
      data
    );
    return response.data;
  } catch (error) {
    console.error("Error updating bill:", error);
    throw error;
  }
};

export interface BillProductsApiResponse {
  success: boolean;
  message: string;
  data: BillProduct[];
}

export const getBillProducts = async () => {
  try {
    const response = await apiClient.get<BillProductsApiResponse>(
      "/bill-products"
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching bill products:", error);
    throw error;
  }
};


export interface ProductAttributeApiResponse {
  success: boolean;
  message: string;
  data: {
    id: number;
    attributeTypeId: number;
    value: string;
  }[];
}

/**
 * Lấy danh sách thuộc tính hiện có của một sản phẩm cha
 * @param productId ID của sản phẩm cha
 */
export const getProductAttributes = async (productId: string | number) => {
  try {
    const response = await apiClient.get<ProductAttributeApiResponse>(
      `/products/${productId}/variants`
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching attributes for product ${productId}:`, error);
    throw error;
  }
};


export default apiClient;
