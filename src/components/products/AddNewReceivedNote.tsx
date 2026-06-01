import React, { useMemo, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, PackagePlus, ArrowRight, Save } from "lucide-react";
import {
  createProviders,
  createReceivedNote,
  getProviders,
  getSearchedProducts,
  type CreateReceivedNoteParams,
} from "@/services/api";
import { toast } from "sonner";
import type { Provider } from "@/types";
import { SingleCombobox } from "../ui/SingleCombobox";

interface SelectedProduct {
  id: string;
  name: string;
  initialPrice: number;
  [key: string]: any;
}

interface AddNewReceivedNoteProps {
  selectedProducts: SelectedProduct[];
  onSuccess?: () => void;
}

const formatDisplay = (val: number | string) => {
  if (val === "" || val === undefined || val === null) return "0";
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseNumber = (val: string) => {
  const parsed = Number(val.replace(/,/g, ""));
  return isNaN(parsed) ? 0 : parsed;
};

const formSchema = z.object({
  providerId: z.string().min(1, "Vui lòng chọn nhà cung cấp"),
  createdAt: z.string(),
  receivedProducts: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        addQuantity: z.number().min(1, "Tối thiểu 1"),
        price: z.number().min(0),
        discount: z.number().min(0),
      })
    )
    .min(1, "Chưa có sản phẩm nào trong phiếu"),
  totalDiscount: z.number().min(0),
  paidAmount: z.number().min(0),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddNewReceivedNote({
  selectedProducts,
  onSuccess,
}: AddNewReceivedNoteProps) {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  // Thêm vào ngay dưới phần khai báo state `providers` hiện tại:
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const fetchData = async () => {
    try {
      const [provRes] = await Promise.all([
        getProviders({
          search: "",
          page: 1,
          pageSize: 1000,
        } as any),
      ]);

      if (provRes.success) {
        setProviders(provRes.data);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      providerId: "",
      createdAt: new Date().toISOString().slice(0, 16),
      receivedProducts: [],
      totalDiscount: 0,
      paidAmount: 0,
      description: "",
    },
  });

  const { control, handleSubmit, setValue, getValues } = form;
  const { fields, remove, replace, append } = useFieldArray({
    control,
    name: "receivedProducts",
  });

  const watchedProducts = useWatch({ control, name: "receivedProducts" });
  const watchedTotalDiscount = useWatch({ control, name: "totalDiscount" });
  const watchedPaidAmount = useWatch({ control, name: "paidAmount" });

  useEffect(() => {
    if (selectedProducts?.length > 0) {
      const formatted = selectedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        addQuantity: 1,
        price: p.initialPrice || 0,
        discount: 0,
      }));
      replace(formatted);
    }
  }, [selectedProducts, replace]);

  const totals = useMemo(() => {
    let totalQuantity = 0; // Thêm biến lưu tổng số lượng
    const subTotal = (watchedProducts || []).reduce((sum, item) => {
      const qty = item?.addQuantity || 0;
      const price = item?.price || 0;
      const disc = item?.discount || 0;
      totalQuantity += qty; // Cộng dồn số lượng từng sản phẩm
      return sum + (price - disc) * qty;
    }, 0);
    const totalAmount = subTotal - (watchedTotalDiscount || 0);
    const debt = totalAmount - (watchedPaidAmount || 0);
    return { subTotal, totalAmount, totalQuantity, debt };
  }, [watchedProducts, watchedTotalDiscount, watchedPaidAmount]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") e.preventDefault();
  };

  // Thêm useEffect xử lý Debounce Search ngay dưới logic fetchData/useEffect hiện tại:
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const term = searchTerm.toLowerCase().trim();

      if (!term) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await getSearchedProducts({
          search: term.toUpperCase(),
        });

        if (response.success) {
          // Flatten variants giống cấu trúc dữ liệu bên file SalePOS
          const results = response.data.flatMap((parent: any) =>
            parent.variants && Array.isArray(parent.variants)
              ? parent.variants
              : [parent]
          );
          setSearchResults(results);
        }
      } catch (error) {
        console.error("Lỗi search API:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Hàm xử lý khi chọn sản phẩm từ danh sách tìm kiếm đổ xuống để đẩy vào React Hook Form
  const handleAddProductFromSearch = (product: any) => {
    const currentProducts = getValues("receivedProducts") || [];
    const existingIdx = currentProducts.findIndex((p) => p.id === product.id);

    if (existingIdx > -1) {
      // Nếu sản phẩm đã tồn tại trong danh sách, tăng số lượng lên 1
      const currentQty = currentProducts[existingIdx].addQuantity || 0;
      setValue(`receivedProducts.${existingIdx}.addQuantity`, currentQty + 1);
    } else {
      // SỬA TẠI ĐÂY: Sử dụng append thay vì replace để giữ vững state của Field Array
      append({
        id: product.id,
        name: product.name,
        addQuantity: 1,
        price: product.initialPrice || product.salePrice || 0,
        discount: 0,
      });
    }

    // Reset thanh tìm kiếm
    setSearchTerm("");
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const onSaveDraft = async () => {
    const data = getValues();
    // Validate sơ bộ vì lưu nháp thường không bắt buộc validate hết zod
    if (!data.providerId) {
      toast.error("Vui lòng chọn nhà cung cấp để lưu nháp");
      return;
    }

    try {
      const apiParams: CreateReceivedNoteParams = {
        providerId: data.providerId,
        phoneNumber: "",
        description: data.description || "",
        discount: data.totalDiscount,
        payedMoney: data.paidAmount,
        debtMoney: totals.debt,
        total: totals.totalAmount,
        status: "draft",
        receivedProducts: data.receivedProducts.map((p) => ({
          productId: p.id,
          addQuantity: p.addQuantity,
          discount: p.discount,
          description: p.name,
          total: (p.price - p.discount) * p.addQuantity,
        })),
      };

      await createReceivedNote(apiParams);
      toast.info("Đã lưu bản nháp");
      if (onSuccess) {
        onSuccess();
      }
      form.reset(); // Xóa trắng form sau khi tạo thành công
      // Thêm logic đóng Dialog hoặc điều hướng nếu cần
      setOpen(false);
    } catch (error) {
      toast.error("Không thể lưu nháp");
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      // 1. Mapping dữ liệu từ form sang params API
      const apiParams: CreateReceivedNoteParams = {
        providerId: data.providerId, // Chuyển từ string sang number nếu backend yêu cầu
        phoneNumber: "", // Bạn có thể lấy từ object provider nếu có dữ liệu NCC
        description: data.description || "",
        discount: data.totalDiscount,
        payedMoney: data.paidAmount,
        debtMoney: totals.debt, // Giá trị này đã được tính: (Total - Discount) - Paid
        total: totals.totalAmount, // Giá trị này đã được tính: Subtotal - Discount

        status: "confirm",
        receivedProducts: data.receivedProducts.map((p) => ({
          productId: p.id,
          addQuantity: p.addQuantity,
          discount: p.discount,
          description: p.name,
          // Đảm bảo tính toán đúng cho từng dòng sản phẩm
          total: (p.price - p.discount) * p.addQuantity,
        })),
      };

      // 2. Gọi API
      const response = await createReceivedNote(apiParams);

      if (response.success) {
        toast.success("Tạo phiếu nhập hàng thành công!");
        if (onSuccess) {
          onSuccess();
        }
        form.reset(); // Xóa trắng form sau khi tạo thành công
        // Thêm logic đóng Dialog hoặc điều hướng nếu cần
        setOpen(false);
      }
    } catch (error) {
      console.error("Lỗi khi tạo phiếu:", error);
      toast.error("Có lỗi xảy ra khi gửi yêu cầu. Vui lòng kiểm tra lại.");
    }
  };

  // Thêm vào trong AddNewReceivedNote
  const handleQuickAddProvider = async (name: string) => {
    try {
      const res = await createProviders({
        name,
        status: "active",
        debtTotal: 0,
        total: 0,
      });

      if (res.success && res.data) {
        toast.success("Đã tạo nhà cung cấp mới");
        await fetchData();

        // SỬA TẠI ĐÂY:
        // Nếu res.data là đối tượng mới tạo:
        const newProvider = Array.isArray(res.data) ? res.data[0] : res.data;

        if (newProvider?.id) {
          setValue("providerId", newProvider.id.toString());
        }
      }
    } catch (error) {
      toast.error("Không thể thêm nhanh nhà cung cấp");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10 transition-colors"
          disabled={selectedProducts.length <= 0}
        >
          Nhập hàng{" "}
          {selectedProducts.length > 0 && `(${selectedProducts.length})`}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[95vw] min-w-[95vw] h-[90vh] flex flex-col p-0 bg-background border-border shadow-2xl text-foreground overflow-hidden">
        <DialogHeader className="p-4 border-b border-border bg-card shrink-0">
          <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
            <PackagePlus className="text-primary h-5 w-5" /> Tạo phiếu nhập hàng
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-1 min-h-0 overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* LEFT SIDE: Danh sách sản phẩm */}
            <div className="flex-[2] flex flex-col min-w-0 border-r border-border bg-muted/10 h-full">
              {/* LEFT SIDE: Danh sách sản phẩm */}

              <div className="p-4 bg-background border-b border-border shrink-0 relative z-50">
                <div className="relative">
                  <Input
                    ref={searchInputRef}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() =>
                      setTimeout(() => setIsSearchFocused(false), 300)
                    } // Tăng lên 300ms cho an toàn
                    placeholder="Tìm hàng hóa (Mã, tên, barcode)..."
                    className="pl-10 bg-background border-input focus-visible:ring-primary"
                  />
                  <Plus className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>

                {/* DROPDOWN KẾT QUẢ TÌM KIẾM */}
                {isSearching ? (
                  <div className="absolute top-full left-4 right-4 bg-card border border-border p-3 shadow-lg z-[100] text-sm text-muted-foreground">
                    Đang tìm kiếm sản phẩm...
                  </div>
                ) : (
                  // SỬA ĐIỀU KIỆN: Chỉ cần có kết quả và ô input đang có chữ/đang focus là hiện
                  isSearchFocused &&
                  searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border shadow-2xl z-[100] max-h-60 overflow-y-auto rounded-md custom-scrollbar">
                      {searchResults.map((p) => (
                        <div
                          key={p.id}
                          className="p-3 border-b border-border flex justify-between items-center hover:bg-primary/5 cursor-pointer"
                          onMouseDown={(e) => {
                            e.preventDefault(); // Ngăn ô input bị mất focus (blur) trước khi nhận click
                            handleAddProductFromSearch(p);
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              Mã: {p.id} | Tồn: {p.quantity ?? 0}
                            </span>
                          </div>
                          <span className="text-sm font-black text-primary">
                            {(
                              p.initialPrice ||
                              p.salePrice ||
                              0
                            ).toLocaleString()}{" "}
                            đ
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full w-full">
                  <div className="p-4">
                    <div className="rounded-md border border-border bg-card overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                          <TableRow className="border-b border-border">
                            <TableHead className="w-12 text-center font-bold">
                              STT
                            </TableHead>
                            <TableHead className="font-bold">Mã hàng</TableHead>
                            <TableHead className="w-[300px] font-bold">
                              Tên hàng
                            </TableHead>
                            <TableHead className="text-right font-bold">
                              Số lượng
                            </TableHead>
                            <TableHead className="text-right font-bold">
                              Đơn giá
                            </TableHead>
                            <TableHead className="text-right font-bold">
                              Giảm giá
                            </TableHead>
                            <TableHead className="text-right font-bold">
                              Thành tiền
                            </TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => {
                            const row = watchedProducts?.[index];
                            const rowTotal =
                              ((row?.price || 0) - (row?.discount || 0)) *
                              (row?.addQuantity || 0);
                            return (
                              <TableRow
                                key={field.id}
                                className="border-b border-border hover:bg-muted/5"
                              >
                                <TableCell className="text-center text-muted-foreground">
                                  {index + 1}
                                </TableCell>
                                <TableCell className="font-bold text-primary">
                                  {row?.id}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {field.name}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={formatDisplay(row?.addQuantity ?? 0)}
                                    onChange={(e) =>
                                      setValue(
                                        `receivedProducts.${index}.addQuantity`,
                                        parseNumber(e.target.value)
                                      )
                                    }
                                    className="w-20 ml-auto text-right"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={formatDisplay(row?.price ?? 0)}
                                    onChange={(e) =>
                                      setValue(
                                        `receivedProducts.${index}.price`,
                                        parseNumber(e.target.value)
                                      )
                                    }
                                    className="w-28 ml-auto text-right font-medium"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    value={formatDisplay(row?.discount ?? 0)}
                                    onChange={(e) =>
                                      setValue(
                                        `receivedProducts.${index}.discount`,
                                        parseNumber(e.target.value)
                                      )
                                    }
                                    className="w-24 ml-auto text-right"
                                  />
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatDisplay(rowTotal)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* RIGHT SIDE: Thanh toán & Thông tin */}
            <div className="flex-1 flex flex-col bg-card border-l border-border h-full min-w-[350px]">
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-6 space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={control}
                        name="providerId"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="font-bold text-foreground">
                              Nhà cung cấp
                            </FormLabel>
                            <FormControl>
                              <SingleCombobox
                                options={providers.map((p) => ({
                                  id: p.id.toString(),
                                  name: p.name,
                                }))}
                                value={field.value}
                                onChange={field.onChange}
                                onAdd={handleQuickAddProvider}
                                placeholder="Chọn hoặc tìm kiếm..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                          
                        )}
                      />
                      
                      <FormField
                        control={control}
                        name="createdAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-foreground">
                              Ngày giờ nhập
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="datetime-local"
                                {...field}
                                className="bg-background"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          Tổng số lượng:
                        </span>
                        <span className="font-semibold">
                          {formatDisplay(totals.totalQuantity)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          Tổng tiền hàng:
                        </span>
                        <span className="font-semibold">
                          {formatDisplay(totals.subTotal)}
                        </span>
                      </div>

                      <FormField
                        control={control}
                        name="totalDiscount"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0 gap-4">
                            <FormLabel className="text-muted-foreground text-sm">
                              Giảm giá phiếu:
                            </FormLabel>
                            <Input
                              className="w-36 text-right text-destructive bg-background h-8"
                              value={formatDisplay(field.value ?? 0)}
                              onChange={(e) =>
                                field.onChange(parseNumber(e.target.value))
                              }
                            />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-between items-center py-3 border-y border-dashed border-border bg-muted/20 px-2 rounded-sm">
                        <span className="font-bold text-sm">CẦN TRẢ:</span>
                        <span className="font-bold text-xl text-primary">
                          {formatDisplay(totals.totalAmount)}
                        </span>
                      </div>

                      <FormField
                        control={control}
                        name="paidAmount"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0 gap-4 pt-2">
                            <FormLabel className="font-bold text-sm">
                              THANH TOÁN:
                            </FormLabel>
                            <Input
                              className="w-36 text-right font-bold text-primary border-primary/50"
                              value={formatDisplay(field.value ?? 0)}
                              onChange={(e) =>
                                field.onChange(parseNumber(e.target.value))
                              }
                            />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-between items-center pt-1">
                        <span className="text-muted-foreground text-xs font-semibold uppercase">
                          Tiền nợ công:
                        </span>
                        <span
                          className={`font-bold ${
                            totals.debt > 0
                              ? "text-destructive"
                              : "text-primary"
                          }`}
                        >
                          {formatDisplay(totals.debt)}
                        </span>
                      </div>
                    </div>

                    <Separator />

                    <FormField
                      control={control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-sm">
                            Ghi chú phiếu
                          </FormLabel>
                          <FormControl>
                            <textarea
                              className="w-full min-h-[80px] p-2 rounded-md border border-input bg-background text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                              placeholder="Thông tin thêm..."
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </ScrollArea>
              </div>

              <div className="p-4 border-t border-border bg-background shrink-0 space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onSaveDraft}
                    className="flex-1 border-primary text-primary hover:bg-primary/50 font-bold py-6"
                  >
                    <Save className="mr-2 h-5 w-5" />
                    LƯU NHÁP
                  </Button>
                  <Button
                    type="submit"
                    className="flex-[2] bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-6 text-lg shadow-lg"
                  >
                    XÁC NHẬN NHẬP
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
