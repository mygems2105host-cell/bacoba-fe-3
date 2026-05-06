import AddNewProduct from "@/components/products/AddNewProduct";
import TagCombobox from "@/components/ui/TagCombobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  // ArrowRight,
  ChevronDown,
  ChevronRight,
  Edit,
  // Edit,
  MoreHorizontal,
  Plus,
  // Plus,
  RefreshCcw,
  Trash2,
  // Trash2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React, { useState, useMemo, useEffect } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  // DropdownMenuLabel,
  // DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Import dữ liệu Mock
// import { mockAttributeTypes } from "@/types/AttributeType";
// import { mockAttributes } from "@/types/Attribute";
// import { MOCK_PROVIDERS } from "@/types/Provider";
import { AddNewReceivedNote } from "@/components/products/AddNewReceivedNote";
import { ManageAttributeTypes } from "@/components/attibute-types/ManageAttributeTypes";
import { ManageProductTypes } from "@/components/products/ManageProductTypes";
import {
  getAttributeTypes,
  getAttributes,
  getProductTypes,
  getProducts,
  createProductType,
  createAttribute,
  getProductAttributes, // Giả định service này tồn tại trong api.ts
  // type GetProductsParams,
} from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import EditVariantDialog from "@/components/products/EditVariantDialog";
import { toast } from "sonner"; // Hoặc thư viện thông báo bạn đang dùng
import RenameProductDialog from "@/components/products/RenameProductDialog";
import AddMoreVariantsDialog from "@/components/products/AddMoreVariantsDialog";

function ProductsList() {
  interface Option {
    id: string;
    name: string;
  }

  const [products, setProducts] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]); // Thêm dòng này
  const [attributeTypes, setAttributeTypes] = useState<any[]>([]); // New state
  const [attributes, setAttributes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  // --- Quản lý State ---
  const [selectedProductTypes, setSelectedProductTypes] = useState<Option[]>(
    []
  );
  // const [selectedProviders, setSelectedProviders] = useState<Option[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, Option[]>
  >({});

  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  // State lưu trữ danh sách các Object sản phẩm con (variants) được chọn
  const [selectedVariants, setSelectedVariants] = useState<any[]>([]);
  // Pagination & Filter States
  const [currentPage] = useState(1);
  const [pageSize] = useState(10);
  const [, setTotalPages] = useState(1);
  const [, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedTypes] = useState<Option[]>([]);
  const [currentProductAttributes, setCurrentProductAttributes] = useState<
    any[]
  >([]);
  // const [selectedSizes, setselectedSizes] = useState<Option[]>([]);
  // const [selectedColors, setselectedColors] = useState<Option[]>([]);
  // const [selectedProviders, setselectedProviders] = useState<Option[]>([]);

  // const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const fetchProductsData = async () => {
    setLoading(true);
    try {
      // 1. Chuyển đổi mảng product types thành chuỗi "id1,id2"
      const typeIdsParam = selectedProductTypes.map((t) => t.id).join(",");

      // 2. Chuyển đổi object attributes thành chuỗi "id1,id2,id3"
      // Phẳng hóa tất cả các giá trị từ các loại thuộc tính khác nhau
      const attributeIdsParam = Object.values(selectedAttributes)
        .flat()
        .map((attr) => attr.id)
        .join(",");

      const res = await getProducts({
        page: currentPage,
        pageSize: pageSize,
        search: search || undefined,
        status: "active",
        // Thêm 2 tham số mới vào đây (đảm bảo interface GetProductsParams trong api.ts đã nhận)
        typeId: typeIdsParam || undefined,
        attribute: attributeIdsParam || undefined,
      });
      if (res && res.data) {
        setProducts([...res.data]); // Spread để chắc chắn tạo reference mới cho array
        setTotalItems(res.meta.totalItems);
        setTotalPages(res.meta.totalPages);
     }
    } catch (err: any) {
      setError(err?.message || "Lỗi tải sản phẩm");
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };
  const handleReload = () => {
    // Nếu bạn muốn reload hoàn toàn về trang 1 và xóa search:
    // setCurrentPage(1);
    // setSearch("");

    // Gọi lại API
    fetchProductsData();
  };

  useEffect(() => {
    fetchProductsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, search, selectedProductTypes, selectedAttributes]); // Lưu ý: dùng selectedProductTypes thay vì selectedTypes nếu state bên dưới dùng tên đó
  const fetchStaticMetadata = async () => {
    try {
      const [typesRes, attrTypesRes] = await Promise.all([
        getProductTypes(),
        getAttributeTypes(),
      ]);
      if (typesRes.success) setProductTypes(typesRes.data);
      if (attrTypesRes.success) setAttributeTypes(attrTypesRes.data);
    } catch (err) {
      console.error("Lỗi tải Metadata:", err);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };
  useEffect(() => {
    fetchStaticMetadata();
  }, []);
  const fetchAttributesData = async () => {
    try {
      const res = await getAttributes();
      if (res.success) setAttributes(res.data);
    } catch (err) {
      console.error("Lỗi tải danh sách giá trị thuộc tính:", err);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };
  useEffect(() => {
    fetchAttributesData();
  }, []);

  // --- Chuyển đổi dữ liệu sang Options cho Combobox ---
  const productTypeOptions: Option[] = useMemo(
    () => productTypes.map((t) => ({ id: t.id, name: t.name })),
    [productTypes] // Dependency là state productTypes
  );

  // const providersOptions: Option[] = useMemo(
  //   () => MOCK_PROVIDERS.map((p) => ({ id: p.id, name: p.name })),
  //   []
  // );

  // --- Logic Xử lý ---
  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  /**
   * Xử lý khi click vào checkbox hàng cha
   * Sẽ thêm hoặc xóa toàn bộ Object sản phẩm con của cha đó
   */
  const handleClearSelection = () => {
    setSelectedVariants([]);
  };
  const handleSelectRow = (variants: any[]) => {
    const variantIds = variants.map((v) => v.id);
    const allSelected = variantIds.every((id) =>
      selectedVariants.some((sv) => sv.id === id)
    );

    if (allSelected) {
      // Nếu tất cả con của cha này đã được chọn -> Xóa chúng khỏi danh sách
      setSelectedVariants((prev) =>
        prev.filter((sv) => !variantIds.includes(sv.id))
      );
    } else {
      // Nếu chưa chọn hết -> Thêm những con chưa có vào danh sách (dưới dạng Object)
      setSelectedVariants((prev) => {
        const existingIds = prev.map((sv) => sv.id);
        const newVariants = variants.filter((v) => !existingIds.includes(v.id));
        return [...prev, ...newVariants];
      });
    }
  };

  /**
   * Xử lý khi click vào checkbox hàng con (biến thể)
   */
  const handleSelectVariant = (variant: any) => {
    setSelectedVariants((prev) =>
      prev.some((sv) => sv.id === variant.id)
        ? prev.filter((sv) => sv.id !== variant.id)
        : [...prev, variant]
    );
  };

  // Hàm thêm mới loại sản phẩm nhanh từ Combobox
  const handleAddNewProductType = async (name: string) => {
    try {
      const res = await createProductType({ name });
      if (res.success && res.data) {
        toast.success(`Đã thêm nhóm hàng: ${name}`);

        // Ép kiểu 'res.data' về 'any' để lấy id và name
        const data = res.data as any;

        const newItem: Option = {
          id: String(data.id),
          name: data.name || name,
        };

        setSelectedProductTypes((prev) => [...prev, newItem]);
        await fetchStaticMetadata();
      }
    } catch (err) {
      console.error("Lỗi:", err);
      toast.error("Không thể thêm nhóm hàng");
    }
  };

  // --- Logic Xử lý Thêm Attribute nhanh ---
  const handleAddNewAttribute = async (
    value: string,
    attributeTypeId: string
  ) => {
    try {
      const res = await createAttribute({ value, attributeTypeId });

      if (res.success && res.data) {
        toast.success(`Đã thêm giá trị: ${value}`);

        // Ép kiểu 'res.data' về 'any'
        const data = res.data as any;

        const newItem: Option = {
          id: String(data.id),
          name: data.value || value, // Thường attribute dùng field 'value' thay vì 'name'
        };

        setSelectedAttributes((prev) => ({
          ...prev,
          [attributeTypeId]: [...(prev[attributeTypeId] || []), newItem],
        }));

        await fetchAttributesData();
      }
    } catch (err) {
      console.error("Lỗi:", err);
      toast.error("Không thể thêm giá trị mới");
    }
  };

  const fetchCurrentProductAttributes = async (productId: string) => {
    try {
      const res = await getProductAttributes(productId);
      if (res.success) {
        setCurrentProductAttributes(res.data);
      }
    } catch (err) {
      console.error("Lỗi lấy thuộc tính sản phẩm:", err);
      setCurrentProductAttributes([]); // Reset nếu lỗi
    }
  };

  if (loading)
    return (
      <div className="w-full h-full p-5 flex flex-wrap gap-y-6 bg-background">
        {/* Tiêu đề & Thanh công cụ Skeleton */}
        <div className="basis-1/4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="basis-3/4 flex flex-wrap justify-between">
          <div className="basis-1/2">
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="basis-1/3 flex justify-around items-center">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Sidebar Bộ lọc Skeleton */}
        <div className="basis-1/4 w-full px-5 border-r border-border">
          <div className="flex flex-col gap-y-8">
            {/* Nhóm hàng */}
            <div>
              <div className="flex justify-between mb-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Thuộc tính */}
            <div className="flex flex-col gap-y-4">
              <div className="flex justify-between mb-1">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-x-2">
                  <Skeleton className="h-4 basis-1/3" />
                  <Skeleton className="h-9 basis-2/3" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bảng dữ liệu Skeleton */}
        <div className="basis-3/4 min-h-[calc(100vh-200px)] flex flex-col pl-4">
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[50px]">
                    <Skeleton className="h-4 w-4" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                  <TableHead>
                    <Skeleton className="h-4 w-40" />
                  </TableHead>
                  <TableHead className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableHead>
                  <TableHead className="text-right">
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableHead>
                  <TableHead className="text-right">
                    <Skeleton className="h-4 w-12 ml-auto" />
                  </TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((row) => (
                  <TableRow key={row} className="border-border">
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-64" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-10 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Phân trang Skeleton */}
          <div className="py-6 flex justify-center gap-2">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
    );
    console.log("Current Products in State:", products);
  return (
    <div className="w-full h-full p-5 flex flex-wrap gap-y-6 bg-background text-foreground">
      {/* Tiêu đề & Thanh công cụ */}
      <div className="basis-1/4">
        <div className="basis-full flex flex-wrap">
          <p className="text-2xl font-bold text-primary">Hàng hóa</p>
        </div>
      </div>
      <div className="basis-3/4 flex flex-wrap justify-between">
        <div className="basis-1/2">
          <Input
            type="search"
            placeholder="Tìm theo mã, tên hàng hóa"
            className="focus-visible:ring-primary border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="basis-1/3 flex justify-around items-center">
          <AddNewProduct
            attributes={attributes}
            attributeTypes={attributeTypes}
            productTypes={productTypes}
            onSuccess={fetchProductsData}
            refetchAttributes={fetchAttributesData}
          />
          <Button
            variant={"ghost"}
            onClick={handleReload}
            disabled={loading} // Vô hiệu hóa khi đang load
          >
            <RefreshCcw className={loading ? "animate-spin" : ""} />
          </Button>
          <AddNewReceivedNote
            selectedProducts={selectedVariants}
            onSuccess={handleClearSelection}
          />
        </div>
      </div>

      {/* Sidebar Bộ lọc */}
      <div className="basis-1/4 w-full px-5 border-r border-border">
        <div className="basis-full w-full flex flex-wrap gap-y-6">
          <div className="basis-full w-full">
            <p className="basis-full text-sm font-bold py-3 text-foreground flex flex-wrap justify-between">
              <span>Nhóm hàng</span>
              <ManageProductTypes onSuccess={fetchStaticMetadata} />
            </p>
            <TagCombobox
              options={productTypeOptions}
              selected={selectedProductTypes}
              onChange={(val) => setSelectedProductTypes(val)}
              onAdd={handleAddNewProductType} // Thêm hàm tạo nhanh tại đây
              showAddOption={true}
              placeholder="Chọn nhóm hàng..."
            />
          </div>

          <div className="basis-full w-full flex flex-wrap gap-y-3">
            <p className="basis-full text-sm font-bold py-3 text-foreground flex flex-wrap justify-between">
              <span>Thuộc tính</span>
              <ManageAttributeTypes
                types={attributeTypes}
                setTypes={setAttributeTypes}
                onSuccess={fetchStaticMetadata}
              />
            </p>

            {/* Sử dụng dữ liệu từ State thay vì Mock */}
            {attributeTypes.map((type) => {
              const optionsForType = attributes
                .filter((attr) => {
                  // Kiểm tra ID loại thuộc tính (Lưu ý: tùy vào cấu trúc API trả về là object hay string)
                  const typeId =
                    typeof attr.attributeType === "object"
                      ? attr.attributeType?.id
                      : attr.attributeTypeId;
                  return typeId === type.id;
                })
                .map((attr) => ({ id: attr.id, name: attr.value }));

              return (
                <div
                  key={type.id}
                  className="basis-full w-full flex flex-wrap items-center px-2"
                >
                  <p className="basis-1/3 text-xs text-muted-foreground font-medium italic">
                    {type.name}
                  </p>
                  <div className="basis-2/3 w-full">
                    <TagCombobox
                      options={optionsForType}
                      selected={selectedAttributes[type.id] || []}
                      onAdd={(value) => handleAddNewAttribute(value, type.id)}
                      showAddOption={true}
                      onChange={(val) =>
                        setSelectedAttributes((prev) => ({
                          ...prev,
                          [type.id]: val,
                        }))
                      }
                      placeholder={`Chọn ${type.name.toLowerCase()}...`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* <div className="basis-full w-full">
            <p className="text-sm font-bold py-3 text-foreground">
              Nhà cung cấp
            </p>
            <TagCombobox
              options={providersOptions}
              selected={selectedProviders}
              onChange={(val) => setSelectedProviders(val)}
              placeholder="Chọn nhà cung cấp..."
            />
          </div> */}
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="basis-3/4 min-h-[calc(100vh-200px)] flex flex-col justify-between pl-4">
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="border-border">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      selectedVariants.length > 0 &&
                      products.every((p) =>
                        p.variants.every((v: any) =>
                          selectedVariants.some((sv) => sv.id === v.id)
                        )
                      )
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const allVariants = products.flatMap((p) => p.variants);
                        setSelectedVariants(allVariants);
                      } else {
                        setSelectedVariants([]);
                      }
                    }}
                    className="border-muted-foreground"
                  />
                </TableHead>
                <TableHead className="font-bold text-foreground">
                  Mã hàng
                </TableHead>
                <TableHead className="font-bold text-foreground">
                  Tên hàng hóa
                </TableHead>
                <TableHead className="text-right font-bold text-foreground">
                  Giá vốn
                </TableHead>
                <TableHead className="text-right font-bold text-foreground">
                  Giá bán
                </TableHead>
                <TableHead className="text-right font-bold text-foreground">
                  Số lượng
                </TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => {
                const variantIds = product.variants.map((v: any) => v.id);

                // Kiểm tra trạng thái checkbox của hàng cha dựa trên mảng Object
                const isAllChildrenSelected = variantIds.every((id: any) =>
                  selectedVariants.some((sv) => sv.id === id)
                );
                const isSomeChildrenSelected =
                  variantIds.some((id: any) =>
                    selectedVariants.some((sv) => sv.id === id)
                  ) && !isAllChildrenSelected;

                return (
                  <React.Fragment key={product.id}>
                    {/* HÀNG CHA */}
                    <TableRow
                      data-state={isAllChildrenSelected && "selected"}
                      className="border-border hover:bg-muted/30"
                    >
                      <TableCell>
                        <button
                          onClick={() => toggleRowExpand(product.id)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          {expandedRows.includes(product.id) ? (
                            <ChevronDown size={16} className="text-primary" />
                          ) : (
                            <ChevronRight
                              size={16}
                              className="text-muted-foreground"
                            />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={
                            isAllChildrenSelected
                              ? true
                              : isSomeChildrenSelected
                              ? "indeterminate"
                              : false
                          }
                          onCheckedChange={() =>
                            handleSelectRow(product.variants)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-sm font-medium text-primary">
                        {product.id}
                      </TableCell>
                      <TableCell className="min-w-[400px] max-w-[400px] text-sm font-medium whitespace-normal break-words">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {product.initialPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {product.salePrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground">
                        {
                          product.variants && product.variants.length > 0
                            ? product.variants.reduce(
                                (sum: number, v: any) =>
                                  sum + (v.quantity || 0),
                                0
                              )
                            : product.quantity // Nếu không có variants thì giữ nguyên số lượng gốc
                        }
                      </TableCell>

                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:text-primary"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="border-border"
                          >
                            <DropdownMenuLabel className="text-muted-foreground">
                              Hành động
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                              }}
                              asChild
                            >
                              <RenameProductDialog
                                product={product}
                                onSuccess={fetchProductsData}
                              />
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                              }}
                              asChild
                            >
                              <AddMoreVariantsDialog
                                product={product}
                                attributeTypes={attributeTypes}
                                attributes={attributes}
                                // Thêm prop mới này (giả định bạn sẽ khai báo prop này ở file con)
                                existingProductAttributes={
                                  currentProductAttributes
                                }
                                onSuccess={fetchProductsData}
                                refetchAttributes={fetchAttributesData}
                                // Kích hoạt fetch khi người dùng tương tác
                                onOpen={() =>
                                  fetchCurrentProductAttributes(product.id)
                                }
                              />
                            </DropdownMenuItem>
                            {/* <DropdownMenuSeparator className="bg-border" /> */}
                            {/* <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Xóa hàng
                            </DropdownMenuItem> */}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>

                    {/* HÀNG CON (VARIANTS) */}
                    {expandedRows.includes(product.id) &&
                      product.variants.map((variant: any) => {
                        const isVariantSelected = selectedVariants.some(
                          (sv) => sv.id === variant.id
                        );
                        return (
                          <TableRow
                            key={variant.id}
                            data-state={isVariantSelected && "selected"}
                            className="bg-muted/10 border-border"
                          >
                            <TableCell></TableCell>
                            <TableCell className="pl-8">
                              <Checkbox
                                checked={isVariantSelected}
                                onCheckedChange={() =>
                                  handleSelectVariant(variant)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {variant.id}
                            </TableCell>
                            <TableCell className="pl-10 text-sm italic text-muted-foreground">
                              {variant.name}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground italic">
                              {variant.initialPrice.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground italic font-medium">
                              {variant.salePrice.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {variant.quantity}
                            </TableCell>
                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="border-border"
                                >
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                    }}
                                  >
                                    <EditVariantDialog
                                      variant={variant}
                                      onSuccess={fetchProductsData}
                                    />
                                  </DropdownMenuItem>
                                  {/* <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Xóa biến
                                    thể
                                  </DropdownMenuItem> */}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Phân trang */}
        <div className="py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className="hover:bg-primary/10 hover:text-primary border-border"
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  isActive
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  1
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis className="text-muted-foreground" />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  className="hover:bg-primary/10 hover:text-primary border-border"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}

export default ProductsList;
