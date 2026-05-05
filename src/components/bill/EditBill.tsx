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
  FileEdit,
  ReceiptText,
  User,
  Phone,
  Notebook,
  AlertTriangle,
  Info,
  Loader2,
  PackageSearch,
} from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/types";
import { getProducts } from "@/services/api";

// --- Helpers ---
const formatDisplay = (val: number | string) => {
  if (val === "" || val === undefined || val === null) return "0";
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseNumber = (val: string) => {
  const parsed = Number(val.replace(/,/g, ""));
  return isNaN(parsed) ? 0 : parsed;
};

const STORAGE_KEY_POS = "temp_sales_pos_bills";

// --- Schema ---
const formSchema = z.object({
  id: z.string(),
  customerName: z.string().min(1, "Vui lòng nhập tên khách hàng"),
  phoneNumber: z.string().optional(),
  createdAt: z.string(),
  billItems: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      quantity: z.number().min(1, "Số lượng tối thiểu là 1"),
      unitPrice: z.number().min(0),
      originalPrice: z.number().optional(),
      initialQuantity: z.number().optional(), // Đổi stock thành initialQuantity (tồn kho thực tế)
      originalQtyInBill: z.number(),
    })
  ),
  totalDiscount: z.number().min(0),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditBill({
  bill,
  onSuccess,
}: {
  bill: any;
  onSuccess?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [showPriceWarning, setShowPriceWarning] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Giả định fetchProducts lấy danh sách sản phẩm để cập nhật số lượng tồn kho mới nhất
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      // Thay thế bằng hàm call API thực tế của bạn
      const res = await getProducts({ pageSize: 100000 });
      if (res.success) {
        const variants = res.data.flatMap((p) => p.variants || []);
        setProducts(variants);
      }
    } catch (error) {
      toast.error("Không thể cập nhật tồn kho mới nhất");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchProducts();
    }
  }, [open]);
  // --- 1. LOGIC KHO HÀNG ẢO ---
  const committedQuantities = useMemo(() => {
    const counts: Record<string, number> = {};
    const saved = localStorage.getItem(STORAGE_KEY_POS);
    if (saved) {
      try {
        const bills = JSON.parse(saved);
        if (Array.isArray(bills)) {
          bills.forEach((b) => {
            // Chỉ tính những bill tạm khác với bill hiện tại đang sửa
            if (b.id?.toString() !== bill?.id?.toString()) {
              (b.billProducts || []).forEach((p: any) => {
                const id = p.productId || p.id;
                if (id) counts[id] = (counts[id] || 0) + (p.quantity || 0);
              });
            }
          });
        }
      } catch (e) {
        console.error("POS Storage error", e);
      }
    }
    return counts;
  }, [open, bill?.id]);

  // --- 2. KHỞI TẠO FORM ---
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      customerName: "",
      phoneNumber: "",
      createdAt: "",
      billItems: [],
      totalDiscount: 0,
      note: "",
    },
  });

  const { control, handleSubmit, setValue, reset, getValues } = form;
  const { fields, remove } = useFieldArray({ control, name: "billItems" });
  const watchedItems = useWatch({ control, name: "billItems" });
  const watchedTotalDiscount = useWatch({ control, name: "totalDiscount" });

  useEffect(() => {
    if (bill && open && products.length > 0) {
      reset({
        id: bill.id?.toString() || "",
        customerName: bill.customerName || "",
        phoneNumber: bill.phoneNumber || "",
        createdAt: bill.createdAt
          ? new Date(bill.createdAt).toISOString().slice(0, 16)
          : "",
        billItems:
          bill.billProducts?.map((item: any) => {
            const pId = item.productId || item.id;
            const pInStock = products.find((p) => p.id === pId);

            return {
              productId: pId || "",
              productName: item.productName || "Sản phẩm không tên",
              quantity: Number(item.quantity) || 0,
              unitPrice: Number(item.unitPrice || item.salePrice || 0),
              originalPrice: Number(pInStock?.salePrice || item.salePrice || 0),
              // Thống nhất tên biến là initialQuantity theo schema Zod
              initialQuantity: Number(pInStock?.quantity || item.quantity || 0),
              originalQtyInBill: Number(item.quantity || 0),
            };
          }) || [],
        totalDiscount: Number(bill.discount || 0),
        note: bill.note || "",
      });
    }
  }, [bill, reset, open, products]);
  // --- 3. TÍNH TOÁN TỔNG ---
  const totals = useMemo(() => {
    const subTotal = (watchedItems || []).reduce((sum, item) => {
      return sum + (item?.unitPrice || 0) * (item?.quantity || 0);
    }, 0);
    const totalAmount = Math.max(0, subTotal - (watchedTotalDiscount || 0));
    return { subTotal, totalAmount };
  }, [watchedItems, watchedTotalDiscount]);

  // --- 4. XỬ LÝ THAY ĐỔI SỐ LƯỢNG (CHECK KHO) ---
  const handleQuantityChange = (index: number, newVal: number) => {
    const item = getValues(`billItems.${index}`);

    // 1. Tính toán giới hạn tồn kho khả dụng
    const latestProduct = products.find((p) => p.id === item.productId);
    const realStock = latestProduct ? latestProduct.quantity : 0;
    const otherCommitted = committedQuantities[item.productId] || 0;

    // Sử dụng field originalQtyInBill từ Schema mới (hoặc từ props bill cũ)
    const originalQtyInThisBill = Number(item.originalQtyInBill || 0);
    const totalAvailable = realStock + originalQtyInThisBill - otherCommitted;

    // 2. Kiểm tra nếu nhập quá tồn kho
    if (newVal > totalAvailable) {
      toast.error(
        `Sản phẩm ${item.productName} chỉ còn tối đa ${totalAvailable} sản phẩm`
      );
      setValue(`billItems.${index}.quantity`, totalAvailable);
      return;
    }

    // 3. Cập nhật giá trị vào form
    // Chúng ta cho phép lưu số 0 hoặc NaN (khi xóa trống) vào state để người dùng dễ gõ tiếp
    setValue(`billItems.${index}.quantity`, newVal);
  };

  // --- 5. SUBMIT VỚI CẢNH BÁO ---
  const validateAndSubmit = (data: FormValues) => {
    // 1. Chốt chặn số lượng: Duyệt qua tất cả sản phẩm để kiểm tra số lượng >= 1
    for (const item of data.billItems) {
      // Kiểm tra: Nếu là NaN, null, undefined hoặc nhỏ hơn 1
      const qty = Number(item.quantity);


      if (isNaN(qty) || qty < 1) {
        toast.error(
          `Sản phẩm "${item.productName}" yêu cầu số lượng tối thiểu là 1.`
        );
        return;
      }
    }

    // 2. Chốt chặn tồn kho (Logic cũ của bạn)
    for (const item of data.billItems) {
      const latestP = products.find((p) => p.id === item.productId);
      const realStock = latestP ? latestP.quantity : 0;

      const originalBillItem = bill.billProducts?.find(
        (p: any) => (p.productId || p.id) === item.productId
      );
      const originalQtyInThisBill = Number(originalBillItem?.quantity || 0);
      const otherCommitted = committedQuantities[item.productId] || 0;

      const available = realStock + originalQtyInThisBill - otherCommitted;

      if (item.quantity > available) {
        toast.error(
          `Sản phẩm ${item.productName} không đủ tồn kho (Khả dụng tối đa: ${available})`
        );
        return;
      }
    }

    // 3. Chốt chặn giá bán (Cảnh báo lợi nhuận)
    const hasLowPrice = data.billItems.some(
      (item) => item.unitPrice < (item.originalPrice || 0)
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
      // Giả lập API call
      console.log("Saving Bill Data:", data);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success("Cập nhật hóa đơn thành công");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Lỗi khi lưu dữ liệu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const productMap = useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
          >
            <FileEdit className="w-4 h-4" /> Sửa hóa đơn
          </Button>
        </DialogTrigger>

        <DialogContent className="min-w-[95vw] max-w-[95vw] h-[95vh] flex flex-col p-0 bg-background border-border overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ReceiptText className="text-primary h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Chỉnh sửa hóa đơn
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className="text-primary border-primary/30 font-mono"
                  >
                    ID: {bill?.id}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                    <PackageSearch className="w-3 h-3 text-orange-500" />
                    Đã khấu trừ tồn kho ảo từ các bill tạm POS
                  </span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={handleSubmit(validateAndSubmit)}
              className="flex flex-1 overflow-hidden"
            >
              {/* BẢNG SẢN PHẨM */}
              <div className="flex-[3] flex flex-col border-r bg-muted/5">
                <ScrollArea className="flex-1">
                  <div className="p-4">
                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="w-12 text-center">
                              STT
                            </TableHead>
                            <TableHead>Thông tin sản phẩm</TableHead>
                            <TableHead className="text-right w-40">
                              Đơn giá
                            </TableHead>
                            <TableHead className="text-center w-40">
                              Số lượng
                            </TableHead>
                            <TableHead className="text-right w-40">
                              Thành tiền
                            </TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => {
                            const item = watchedItems?.[index];
                            const latestP = productMap.get(item.productId);
                            const realStock = latestP?.quantity || 0;

                            // LOGIC TÍNH KHẢ DỤNG ĐỂ HIỂN THỊ TRÊN BADGE
                            const originalBillItem = bill.billProducts?.find(
                              (p: any) =>
                                (p.productId || p.id) === item.productId
                            );
                            const originalQtyInThisBill = Number(
                              originalBillItem?.quantity || 0
                            );
                            const otherQty =
                              committedQuantities[item.productId] || 0;

                            // Đây là con số người dùng thấy:
                            const displayAvailable =
                              realStock + originalQtyInThisBill - otherQty;

                            const isLowPrice =
                              (item?.unitPrice || 0) <
                              (item?.originalPrice || 0);

                            return (
                              <TableRow
                                key={field.id}
                                className="hover:bg-muted/10 transition-colors"
                              >
                                <TableCell className="text-center text-muted-foreground font-mono text-xs">
                                  {index + 1}
                                </TableCell>
                                <TableCell>
                                  <div className="font-bold text-foreground">
                                    {item?.productName}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] h-4 font-mono px-1"
                                    >
                                      {item?.productId}
                                    </Badge>

                                    <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                      Tồn thực tế:{" "}
                                      <b className="text-foreground">
                                        {realStock}
                                      </b>
                                    </span>

                                    {otherQty > 0 && (
                                      <span className="text-[10px] text-orange-600 font-semibold italic flex items-center gap-0.5">
                                        <AlertTriangle className="w-3 h-3" />{" "}
                                        POS khác giữ: {otherQty}
                                      </span>
                                    )}

                                    {/* BADGE KHẢ DỤNG MỚI */}
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] h-4 border-primary/50 text-primary ${
                                        isLoadingProducts ? "animate-pulse" : ""
                                      }`}
                                    >
                                      Bạn có thể nhập tối đa: {displayAvailable}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="relative group">
                                    <Input
                                      value={formatDisplay(
                                        item?.unitPrice || 0
                                      )}
                                      onChange={(e) =>
                                        setValue(
                                          `billItems.${index}.unitPrice`,
                                          parseNumber(e.target.value)
                                        )
                                      }
                                      className={`text-right font-bold h-9 transition-all ${
                                        isLowPrice
                                          ? "border-destructive bg-destructive/5 text-destructive focus-visible:ring-destructive"
                                          : "border-border"
                                      }`}
                                    />
                                    {isLowPrice && (
                                      <div className="absolute -top-2 -right-1">
                                        <span className="relative flex h-3 w-3">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col items-center gap-1">
                                    <Input
                                      value={formatDisplay(item?.quantity || 0)}
                                      onChange={(e) =>
                                        handleQuantityChange(
                                          index,
                                          parseNumber(e.target.value)
                                        )
                                      }
                                      className="text-center font-black h-9 border-border focus-visible:ring-primary"
                                    />
                                  </div>
                                  {form.formState.errors.billItems?.[index]
                                    ?.quantity && (
                                    <span className="text-[10px] text-destructive font-medium">
                                      Phải có ít nhất 1 sản phẩm
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-black text-foreground">
                                  {formatDisplay(
                                    (item?.unitPrice || 0) *
                                      (item?.quantity || 0)
                                  )}
                                </TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </ScrollArea>
              </div>

              {/* SIDEBAR THÔNG TIN */}
              <ScrollArea className="flex-1">
                <div className="w-[420px] flex flex-col bg-card border-l border-border shadow-2xl z-10">
                  <div className="p-6 space-y-8">
                    {/* Customer Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary font-black text-[11px] uppercase tracking-wider">
                        <User className="w-4 h-4" /> Khách hàng & Thời gian
                      </div>
                      <div className="grid gap-4 p-4 rounded-xl border border-border bg-muted/10">
                        <FormField
                          control={control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-[10px] uppercase text-muted-foreground font-bold">
                                Tên khách hàng
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Nhập tên..."
                                  className="bg-background border-border"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-[10px] uppercase text-muted-foreground font-bold">
                                  Điện thoại
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="090..."
                                    className="bg-background border-border"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={control}
                            name="createdAt"
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-[10px] uppercase text-muted-foreground font-bold">
                                  Ngày lập
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="datetime-local"
                                    {...field}
                                    className="bg-background border-border"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Summary Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary font-black text-[11px] uppercase tracking-wider">
                        <ReceiptText className="w-4 h-4" /> Chi tiết thanh toán
                      </div>
                      <div className="space-y-3 px-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            Tổng tiền hàng:
                          </span>
                          <span className="font-bold text-foreground">
                            {formatDisplay(totals.subTotal)}
                          </span>
                        </div>
                        <FormField
                          control={control}
                          name="totalDiscount"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between space-y-0">
                              <FormLabel className="text-sm text-muted-foreground">
                                Giảm giá hóa đơn:
                              </FormLabel>
                              <div className="relative w-32">
                                <Input
                                  className="text-right h-9 pr-2 text-destructive font-bold border-destructive/20 bg-destructive/5 focus-visible:ring-destructive"
                                  value={formatDisplay(field.value)}
                                  onChange={(e) =>
                                    field.onChange(parseNumber(e.target.value))
                                  }
                                />
                              </div>
                            </FormItem>
                          )}
                        />
                        <div className="pt-4">
                          <div className="p-5 bg-primary rounded-2xl border border-primary/20 flex flex-col gap-1 items-end shadow-lg shadow-primary/20">
                            <span className="font-bold text-[10px] uppercase text-primary-foreground/70 tracking-widest">
                              Tổng cộng thanh toán
                            </span>
                            <span className="font-black text-3xl text-primary-foreground tracking-tighter">
                              {formatDisplay(totals.totalAmount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <FormField
                      control={control}
                      name="note"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                            <Notebook className="w-3 h-3" /> Ghi chú nội bộ
                          </FormLabel>
                          <FormControl>
                            <textarea
                              {...field}
                              className="w-full min-h-[80px] p-3 rounded-xl border border-border bg-muted/5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
                              placeholder="Thông tin thêm về hóa đơn..."
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="p-4 border-t border-border bg-background/80 backdrop-blur-md">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-7 text-lg uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all group"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <>
                          <Save className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                          Xác nhận lưu
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

      {/* ALERT DIALOG: CẢNH BÁO GIÁ */}
      <AlertDialog open={showPriceWarning} onOpenChange={setShowPriceWarning}>
        <AlertDialogContent className="border-destructive/50 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-destructive text-xl">
              Cảnh báo lợi nhuận!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-foreground py-2">
              Có sản phẩm trong hóa đơn đang được bán **thấp hơn giá niêm yết**.
              <br />
              Hệ thống yêu cầu xác nhận để tiếp tục ghi đè.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-2">
            <AlertDialogCancel className="font-bold border-border flex-1">
              Kiểm tra lại
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleFinalSubmit(form.getValues())}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold flex-1"
            >
              Vẫn lưu hóa đơn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
