import React, { useMemo, useState, useEffect } from "react";
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
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Trash2,
  Save,
  Undo2,
  Search,
  AlertTriangle,
  ScanBarcode,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { getProducts } from "@/services/api";
import type { Product } from "@/types";

// --- Helpers ---
const formatNumber = (val: number) => new Intl.NumberFormat().format(val);
const parseNumber = (val: string) => Number(val.replace(/,/g, "")) || 0;
const STORAGE_KEY_POS = "temp_sales_pos_bills";

// --- Schema ---
const formSchema = z.object({
  oldBillId: z.string(),
  returnItems: z.array(
    z
      .object({
        productId: z.string(),
        productName: z.string(),
        maxQuantity: z.number(),
        quantity: z.number().min(0),
        salePrice: z.number(),
        total: z.number(),
      })
      .refine((data) => data.quantity <= data.maxQuantity, {
        message: "Số lượng trả không được vượt quá số lượng đã mua",
        path: ["quantity"],
      })
  ),
  exchangeItems: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      quantity: z.number().min(1),
      salePrice: z.number(),
      originalPrice: z.number(),
      discount: z.number(),
      total: z.number(),
      stock: z.number(),
    })
  ),
  totalDiscount: z.number(),
  paidAmount: z.number(),
  description: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function ExchangeBill({
  originalBill,
  onSuccess,
}: {
  originalBill: any;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showPriceWarning, setShowPriceWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oldDiscount, setOldDiscount] = useState(0);

  // Thêm useEffect này để lấy discount gốc từ bill cũ khi mở popup
  useEffect(() => {
    if (open && originalBill) {
      setOldDiscount(originalBill.discount || 0);
    }
  }, [originalBill, open]);

  // --- 1. LOGIC KHO HÀNG ẢO ---
  const committedQuantities = useMemo(() => {
    const counts: Record<string, number> = {};
    const saved = localStorage.getItem(STORAGE_KEY_POS);
    if (saved) {
      try {
        const bills = JSON.parse(saved);
        if (Array.isArray(bills)) {
          bills.forEach((bill) => {
            (bill.billProducts || []).forEach((p: any) => {
              if (p.id) counts[p.id] = (counts[p.id] || 0) + (p.quantity || 0);
            });
          });
        }
      } catch (e) {
        console.error("POS Storage error", e);
      }
    }
    return counts;
  }, [open]);

  // --- 2. KHỞI TẠO FORM ---
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oldBillId: originalBill?.id?.toString() || "",
      returnItems:
        originalBill?.saleProducts?.map((p: any) => ({
          productId: p.productId?.toString() || "",
          productName: p.productName || "",
          maxQuantity: p.quantity || 0,
          quantity: 0,
          salePrice: p.salePrice || 0,
          total: 0,
        })) || [],
      exchangeItems: [],
      totalDiscount: 0,
      paidAmount: 0,
      description: "",
    },
  });

  const { control, handleSubmit, setValue } = form;
  const { fields: returnFields } = useFieldArray({
    control,
    name: "returnItems",
  });
  const {
    fields: exchangeFields,
    append,
    remove,
  } = useFieldArray({ control, name: "exchangeItems" });

  const watchedReturns = useWatch({ control, name: "returnItems" });
  const watchedExchanges = useWatch({ control, name: "exchangeItems" });
  const watchedDiscount = useWatch({ control, name: "totalDiscount" });
  const watchedPaid = useWatch({ control, name: "paidAmount" });

  // Kiểm tra xem có thao tác thay đổi nào không (để disable nút)
  const hasChanges = useMemo(() => {
    const hasReturn = watchedReturns.some((item) => item.quantity > 0);
    const hasExchange = watchedExchanges.length > 0;
    return hasReturn || hasExchange;
  }, [watchedReturns, watchedExchanges]);

  useEffect(() => {
    if (open && originalBill?.billProducts) {
      const formattedReturns = originalBill.billProducts.map((p: any) => ({
        productId: (p.productId || p.id)?.toString() || "",
        productName: p.productName || p.name || "",
        maxQuantity: Number(p.quantity) || 0,
        quantity: 0,
        salePrice: Number(p.salePrice || p.salePrice) || 0,
        total: 0,
      }));

      form.reset({
        ...form.getValues(),
        oldBillId: originalBill.id?.toString() || "",
        returnItems: formattedReturns,
        exchangeItems: [],
      });
    }
  }, [originalBill, open, form]);

  // --- 3. FETCH DỮ LIỆU & TÌM KIẾM ---
  useEffect(() => {
    if (open) {
      const fetchProducts = async () => {
        const res = await getProducts({ pageSize: 100000 });
        if (res.success) {
          const variants = res.data.flatMap((p) => p.variants || []);
          setAllProducts(variants);
        }
      };
      fetchProducts();
    }
  }, [open]);

  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setSearchResults([]);
      return;
    }
    const results = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term)
    );
    setSearchResults(results);
  }, [searchTerm, allProducts]);

  const addProductToExchange = (product: Product) => {
    const otherQty = committedQuantities[product.id] || 0;
    const available = product.quantity - otherQty;

    if (available <= 0) {
      toast.error("Sản phẩm đã hết hàng (đang nằm trong các đơn chờ ở POS)");
      return;
    }

    const existingIdx = watchedExchanges.findIndex(
      (item) => item.productId === product.id
    );
    if (existingIdx > -1) {
      const newQty = watchedExchanges[existingIdx].quantity + 1;
      if (newQty > available) {
        toast.warning(`Chỉ còn ${available} sản phẩm khả dụng`);
        return;
      }
      setValue(`exchangeItems.${existingIdx}.quantity`, newQty);
    } else {
      append({
        productId: product.id,
        productName: product.name,
        quantity: 1,
        salePrice: product.salePrice,
        originalPrice: product.salePrice,
        discount: 0,
        total: product.salePrice,
        stock: product.quantity,
      });
    }
    setSearchTerm("");
    setIsSearchFocused(false);
  };

  // --- 4. TÍNH TOÁN TỔNG ---
  const totals = useMemo(() => {
    // 1. Tiền các món hàng khách TRẢ
    const returnTotal = watchedReturns.reduce(
      (sum, item) => (item ? sum + item.quantity * item.salePrice : sum),
      0
    );

    // 2. Tiền các món hàng khách GIỮ LẠI (Mua cũ - Trả)
    const originalBillTotal =
      originalBill?.billProducts?.reduce(
        (sum: number, p: any) => sum + p.quantity * p.salePrice,
        0
      ) || 0;
    const keptItemsTotal = originalBillTotal - returnTotal;

    // 3. Tiền hàng MUA MỚI (Sau khi trừ giảm giá mới)
    const exchangeTotalBeforeDiscount = watchedExchanges.reduce(
      (sum, item) => (item ? sum + item.quantity * item.salePrice : sum),
      0
    );
    const exchangeTotalAfterDiscount = watchedExchanges.reduce(
      (sum, item) =>
        item ? sum + item.quantity * (item.salePrice - item.discount) : sum,
      0
    );

    // 4. Các con số hiển thị theo yêu cầu
    const currentOldDiscount = originalBill?.discount || 0;
    const totalRefund = returnTotal - currentOldDiscount; // Tổng tiền hoàn trả

    const totalAfterExchange = Math.max(
      0,
      exchangeTotalAfterDiscount - watchedDiscount
    );

    // Tổng hóa đơn mới = Hàng giữ lại + Hàng mua mới
    const totalNewBill = keptItemsTotal + totalAfterExchange;

    const diff = totalAfterExchange - totalRefund;
    const needToPay = Math.max(0, diff);
    const refundToCustomer = Math.max(0, -diff);

    return {
      returnTotal,
      exchangeTotal: exchangeTotalBeforeDiscount,
      totalRefund,
      totalAfterExchange,
      totalNewBill,
      needToPay,
      refundToCustomer,
      oldDiscount: currentOldDiscount,
    };
  }, [watchedReturns, watchedExchanges, watchedDiscount, originalBill]);
  // --- 5. SUBMIT & VALIDATION ---
  const validateAndSubmit = (data: FormValues) => {
    const hasLowPrice = data.exchangeItems.some(
      (item) => item.salePrice < item.originalPrice
    );
    if (hasLowPrice) {
      setShowPriceWarning(true);
    } else {
      handleFinalSubmit(data);
    }
  };

  const handleFinalSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // API call logic ở đây
      console.log("Final Payload:", data);
      toast.success("Xử lý đổi trả thành công");
      setOpen(false);
      onSuccess?.();
    } catch (e) {
      toast.error("Lỗi khi lưu hóa đơn");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 font-medium"
          >
            <FileText className="w-4 h-4" />
            Đổi hàng
          </Button>
        </DialogTrigger>

        <DialogContent className="min-w-[90vw] max-w-[90vw] h-[95vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-md text-primary">
                <Undo2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Hệ thống đổi trả hàng
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="font-mono text-xs">
                    GỐC: #{originalBill?.id}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Phát hiện dữ liệu kho ảo từ POS...
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mr-8">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Quét barcode hoặc tìm sản phẩm đổi mới..."
                  className="pl-9 h-10 bg-muted"
                  value={searchTerm}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {isSearchFocused && searchResults.length > 0 && (
                  <div className="absolute top-11 left-0 right-0 bg-background border rounded-md shadow-md z-[100] max-h-96 overflow-y-auto">
                    {searchResults.map((p) => {
                      const otherQty = committedQuantities[p.id] || 0;
                      const available = p.quantity - otherQty;
                      return (
                        <div
                          key={p.id}
                          className={`p-3 border-b flex justify-between items-center cursor-pointer hover:bg-muted ${
                            available <= 0 ? "opacity-50" : ""
                          }`}
                          onClick={() => addProductToExchange(p)}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {p.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Kho: {p.quantity} | POS chờ: {otherQty} |{" "}
                              <span className="text-primary font-medium">
                                Khả dụng: {available}
                              </span>
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-primary">
                              {formatNumber(p.salePrice)}đ
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {p.id}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <Button size="icon" variant="outline">
                <ScanBarcode className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={handleSubmit(validateAndSubmit)}
              className="flex flex-1 overflow-hidden min-h-0"
            >
              {/* CỘT TRÁI: DANH SÁCH HÀNG HOÁ */}
              <div className="flex-[3] flex flex-col border-r overflow-hidden min-h-0">
                <ScrollArea className="flex-1 h-full bg-muted/20">
                  <div className="p-6 space-y-8">
                    {/* HÀNG TRẢ LẠI */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-destructive rounded" />
                        <h3 className="text-sm font-semibold text-destructive">
                          1. Danh sách hàng khách trả
                        </h3>
                      </div>
                      <div className="border rounded-md bg-background overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12 text-center">
                                STT
                              </TableHead>
                              <TableHead>Sản phẩm</TableHead>
                              <TableHead className="text-right">
                                Giá cũ
                              </TableHead>
                              <TableHead className="text-center w-36">
                                SL Trả / Mua
                              </TableHead>
                              <TableHead className="text-right">
                                Hoàn tiền
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {returnFields.length > 0 ? (
                              returnFields.map((field, index) => {
                                const hasError =
                                  form.formState.errors.returnItems?.[index]
                                    ?.quantity;
                                return (
                                  <TableRow key={field.id}>
                                    <TableCell className="text-center">
                                      {index + 1}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {field.productName}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatNumber(field.salePrice)}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center justify-center gap-2">
                                        <Input
                                          className={`w-16 text-center font-medium ${
                                            hasError
                                              ? "border-destructive text-destructive bg-destructive/10"
                                              : "text-destructive"
                                          }`}
                                          value={
                                            watchedReturns[index]?.quantity ?? 0
                                          }
                                          onChange={(e) => {
                                            let val = parseInt(e.target.value);
                                            if (isNaN(val)) val = 0;
                                            if (val < 0) val = 0;

                                            // Tự động set về Max nếu nhập lố
                                            if (val > field.maxQuantity) {
                                              val = field.maxQuantity;
                                            }

                                            setValue(
                                              `returnItems.${index}.quantity`,
                                              val,
                                              { shouldValidate: true }
                                            );
                                          }}
                                          onFocus={(e) => e.target.select()}
                                        />
                                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                          / {field.maxQuantity}
                                        </span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatNumber(
                                        (watchedReturns[index]?.quantity || 0) *
                                          field.salePrice
                                      )}
                                      đ
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="text-center py-6 text-muted-foreground"
                                >
                                  Không tìm thấy sản phẩm nào từ hóa đơn cũ
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </section>

                    {/* HÀNG MỚI */}
                    <section className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-primary rounded" />
                        <h3 className="text-sm font-semibold text-primary">
                          2. Danh sách hàng lấy mới
                        </h3>
                      </div>
                      <div className="border rounded-md bg-background overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12 text-center">
                                STT
                              </TableHead>
                              <TableHead>Sản phẩm</TableHead>
                              <TableHead className="text-right w-36">
                                Giá bán mới
                              </TableHead>
                              <TableHead className="text-center w-28">
                                SL
                              </TableHead>
                              <TableHead className="text-right w-32">
                                Giảm giá
                              </TableHead>
                              <TableHead className="text-right">
                                Thành tiền
                              </TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {exchangeFields.length === 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={7}
                                  className="text-center py-8 text-muted-foreground"
                                >
                                  Chưa chọn sản phẩm đổi mới
                                </TableCell>
                              </TableRow>
                            )}
                            {exchangeFields.map((field, index) => {
                              // Dùng fallback || field để tránh undefined
                              const currentItem =
                                watchedExchanges[index] || field;

                              const isLowPrice =
                                currentItem.salePrice <
                                currentItem.originalPrice;
                              const otherQty =
                                committedQuantities[field.productId] || 0;
                              const available = field.stock - otherQty;

                              return (
                                <TableRow key={field.id}>
                                  <TableCell className="text-center">
                                    {index + 1}
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-medium">
                                      {field.productName}
                                    </div>
                                    <div className="text-xs text-primary mt-1">
                                      Khả dụng: {available}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="relative">
                                      <Input
                                        className={`text-right font-medium ${
                                          isLowPrice
                                            ? "border-destructive text-destructive bg-destructive/10"
                                            : ""
                                        }`}
                                        value={formatNumber(
                                          currentItem.salePrice
                                        )}
                                        onChange={(e) =>
                                          setValue(
                                            `exchangeItems.${index}.salePrice`,
                                            parseNumber(e.target.value)
                                          )
                                        }
                                      />
                                      {isLowPrice && (
                                        <AlertTriangle className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      className="text-center font-medium"
                                      value={formatNumber(currentItem.quantity)}
                                      onChange={(e) => {
                                        const val = parseNumber(e.target.value);
                                        if (val <= available)
                                          setValue(
                                            `exchangeItems.${index}.quantity`,
                                            val
                                          );
                                        else
                                          toast.warning(
                                            `Kho ảo POS chỉ còn ${available} sản phẩm`
                                          );
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      className="text-right text-muted-foreground font-medium"
                                      value={formatNumber(currentItem.discount)}
                                      onChange={(e) =>
                                        setValue(
                                          `exchangeItems.${index}.discount`,
                                          parseNumber(e.target.value)
                                        )
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="text-right font-medium text-primary">
                                    {formatNumber(
                                      currentItem.quantity *
                                        (currentItem.salePrice -
                                          currentItem.discount)
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => remove(index)}
                                    >
                                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </section>
                  </div>
                </ScrollArea>
              </div>
              <ScrollArea className="flex-1 h-full">
                <div className="w-[360px] bg-background flex flex-col min-h-0 border-l">
                  <div className="p-6 space-y-6">
                    {/* Thông tin khách hàng */}
                    <div className="p-4 rounded-md bg-muted/50 border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                          Khách hàng
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          POS SYNC
                        </Badge>
                      </div>
                      <div>
                        <div className="font-semibold text-lg">
                          {originalBill?.customerName || "Khách lẻ"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {originalBill?.customerPhone || "---"}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* KHỐI 1: HOÀN TRẢ */}
                      <div className="space-y-3 pb-4 border-b">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            Tổng tiền sản phẩm trả:
                          </span>
                          <span className="font-medium text-destructive">
                            {formatNumber(totals.returnTotal)}đ
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            Giảm giá cũ (Bill gốc):
                          </span>
                          <span className="font-medium">
                            -{formatNumber(totals.oldDiscount)}đ
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-sm pt-1">
                          <span className="font-medium">
                            Tổng tiền hoàn trả:
                          </span>
                          <span className="font-semibold text-destructive text-base">
                            {formatNumber(totals.totalRefund)}đ
                          </span>
                        </div>
                      </div>

                      {/* KHỐI 2: ĐỔI MỚI */}
                      <div className="space-y-3 pb-4 border-b">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            Tổng tiền mua thêm:
                          </span>
                          <span className="font-medium text-primary">
                            {formatNumber(totals.exchangeTotal)}đ
                          </span>
                        </div>

                        <FormField
                          control={control}
                          name="totalDiscount"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                              <FormLabel className="text-sm font-normal text-muted-foreground">
                                Giảm giá mới:
                              </FormLabel>
                              <Input
                                className="w-24 text-right font-medium h-8"
                                value={formatNumber(field.value)}
                                onChange={(e) =>
                                  field.onChange(parseNumber(e.target.value))
                                }
                              />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-between items-center text-sm pt-1">
                          <span className="font-medium">
                            Tổng tiền sau khi đổi:
                          </span>
                          <span className="font-semibold text-primary text-base">
                            {formatNumber(totals.totalAfterExchange)}đ
                          </span>
                        </div>
                      </div>

                      {/* KHỐI 3: KẾT QUẢ & TỔNG MỚI */}
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center pb-2 border-b border-dashed">
                          <span className="text-sm font-bold text-foreground">
                            TỔNG HÓA ĐƠN MỚI:
                          </span>
                          <span className="font-bold text-foreground text-xl">
                            {formatNumber(totals.totalNewBill)}đ
                          </span>
                        </div>

                        {totals.refundToCustomer > 0 && (
                          <div className="flex justify-between items-center p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
                            <span className="text-sm font-medium">
                              Số tiền cần trả khách:
                            </span>
                            <span className="font-semibold text-lg">
                              {formatNumber(totals.refundToCustomer)}đ
                            </span>
                          </div>
                        )}

                        {totals.needToPay > 0 && (
                          <div className="flex justify-between items-center p-3 rounded-md bg-primary/10 text-primary border border-primary/20">
                            <span className="text-sm font-medium">
                              Số tiền khách cần trả:
                            </span>
                            <span className="font-semibold text-lg">
                              {formatNumber(totals.needToPay)}đ
                            </span>
                          </div>
                        )}

                        {totals.needToPay === 0 &&
                          totals.refundToCustomer === 0 && (
                            <div className="flex justify-between items-center p-3 rounded-md bg-muted text-muted-foreground border">
                              <span className="text-sm font-medium">
                                Chênh lệch:
                              </span>
                              <span className="font-semibold text-lg">0đ</span>
                            </div>
                          )}
                      </div>

                      <FormField
                        control={control}
                        name="description"
                        render={({ field }) => (
                          <FormItem className="pt-2">
                            <FormLabel className="text-sm font-medium text-muted-foreground">
                              Ghi chú đổi trả
                            </FormLabel>
                            <FormControl>
                              <textarea
                                className="flex w-full min-h-[80px] p-3 text-sm rounded-md border border-input bg-transparent shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                                placeholder="Nhập lý do chi tiết..."
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-background border-t shrink-0">
                    <Button
                      type="submit"
                      disabled={isSubmitting || !hasChanges}
                      className="w-full h-12 text-base font-medium"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" /> Xác nhận & In hoá
                          đơn
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* CẢNH BÁO GIÁ THẤP */}
      <AlertDialog open={showPriceWarning} onOpenChange={setShowPriceWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Xác nhận bán dưới giá kho?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hệ thống phát hiện sản phẩm trong danh sách đổi mới có{" "}
              <span className="font-medium text-foreground">
                giá bán thấp hơn giá niêm yết
              </span>
              . Điều này có thể ảnh hưởng đến lợi nhuận. Bạn vẫn muốn tiếp tục?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kiểm tra lại</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => handleFinalSubmit(form.getValues())}
            >
              Xác nhận bán
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
