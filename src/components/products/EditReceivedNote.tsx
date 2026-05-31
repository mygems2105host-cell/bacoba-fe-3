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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Trash2, Save, Edit3, PackageOpen } from "lucide-react";
import type { Provider } from "@/types";
import { editReceivedNote, getProviders } from "@/services/api";
import { toast } from "sonner";

interface EditReceivedNoteProps {
  receivedNote: any;
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
  id: z.coerce.string(), // Tự động biến number thành string
  providerId: z.coerce.string().min(1, "Vui lòng chọn nhà cung cấp"),
  createdAt: z.string().min(1, "Vui lòng chọn ngày giờ nhập"),
  receivedProducts: z
    .array(
      z.object({
        id: z.coerce.string(), // Sửa ở đây nữa
        productId: z.coerce.string(), // Và ở đây
        productName: z.string(),
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

export function EditReceivedNote({
  receivedNote,
  onSuccess,
}: EditReceivedNoteProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false); // Quản lý trạng thái đóng mở Dialog
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
      id: "",
      providerId: "",
      createdAt: "",
      receivedProducts: [],
      totalDiscount: 0,
      paidAmount: 0,
      description: "",
    },
  });

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: {},
  } = form;
  const { fields, remove } = useFieldArray({
    control,
    name: "receivedProducts",
  });

  // Reset form khi dữ liệu receivedNote được truyền vào
  useEffect(() => {
    if (receivedNote) {
      let inputDateTime = "";
      if (receivedNote.createdAt) {
        const dateObj = new Date(receivedNote.createdAt);
        // Chuyển đổi sang múi giờ địa phương (Việt Nam) định dạng YYYY-MM-DDTHH:mm
        const tzOffset = dateObj.getTimezoneOffset() * 60000;
        const localISOTime = new Date(dateObj.getTime() - tzOffset)
          .toISOString()
          .slice(0, 16);
        inputDateTime = localISOTime;
      }
      reset({
        id: receivedNote.id,
        providerId: receivedNote.provider?.id?.toString() || "",
        createdAt: inputDateTime,
        receivedProducts:
          receivedNote.receivedProducts?.map((p: any) => ({
            id: p.id,
            productId: p.productId,
            productName: p.productName,
            addQuantity: p.addQuantity,
            price: p.addQuantity > 0 ? p.total / p.addQuantity : 0,
            discount: 0,
          })) || [],
        totalDiscount: receivedNote.discount || 0,
        // Giả sử API của bạn trả về trường tiền đã trả tên là payedMoney hoặc paidAmount
        paidAmount: receivedNote.payedMoney || 0,
        description: receivedNote.description || "",
      });
    }
  }, [receivedNote, reset]);

  const watchedProducts = useWatch({ control, name: "receivedProducts" });
  const watchedTotalDiscount = useWatch({ control, name: "totalDiscount" });
  const watchedPaidAmount = useWatch({ control, name: "paidAmount" });

  const totals = useMemo(() => {
    const subTotal = (watchedProducts || []).reduce((sum, item) => {
      const qty = item?.addQuantity || 0;
      const price = item?.price || 0;
      const disc = item?.discount || 0;
      return sum + (price - disc) * qty;
    }, 0);
    const totalAmount = subTotal - (watchedTotalDiscount || 0);
    const debt = totalAmount - (watchedPaidAmount || 0);
    return { subTotal, totalAmount, debt };
  }, [watchedProducts, watchedTotalDiscount, watchedPaidAmount]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") e.preventDefault();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      // Chuyển đổi chuỗi "YYYY-MM-DDTHH:mm" từ input thành mã Timestamp số nguyên
      const formattedCreatedAt = new Date(data.createdAt).getTime();

      if (isNaN(formattedCreatedAt)) {
        toast.error("Ngày giờ nhập không hợp lệ");
        return;
      }
      // 2. Chuyển đổi dữ liệu từ Form về format API mong muốn
      const apiParams = {
        providerId: data.providerId,
        description: data.description || "",
        payedMoney: data.paidAmount,
        createdAt: formattedCreatedAt,
        phoneNumber: "",
        debtMoney: totals.debt,
        total: totals.totalAmount,
        discount: data.totalDiscount,
        status: "confirm" as const, // Hoặc giữ nguyên status cũ của phiếu
        receivedProducts: data.receivedProducts.map((p) => ({
          productId: p.productId,
          addQuantity: p.addQuantity,
          discount: p.discount,
          description: "", // Hoặc map từ field nếu có
          total: (p.price - p.discount) * p.addQuantity,
        })),
      };

      // 3. Gọi API
      const response = await editReceivedNote(data.id, apiParams);

      if (response.success) {
        toast.success("Cập nhật phiếu nhập thành công");
        setOpen(false); // Đóng dialog
        if (onSuccess) onSuccess(); // Refresh danh sách ở trang cha
      } else {
        toast.error(response.message || "Có lỗi xảy ra khi cập nhật");
      }
    } catch (error: any) {
      console.error("Lỗi cập nhật:", error);
      toast.error(error.response?.data?.message || "Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="flex items-center gap-2 bg-chart-2 hover:bg-chart-2/90"
          disabled={receivedNote.status !== "confirm"}
        >
          <Edit3 className="w-4 h-4" />
          Chỉnh sửa
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[95vw] min-w-[95vw] h-[90vh] flex flex-col p-0 bg-background border-border shadow-2xl text-foreground overflow-hidden">
        <DialogHeader className="p-4 border-b border-border bg-card shrink-0">
          <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
            <PackageOpen className="text-primary h-5 w-5" /> Hiệu chỉnh phiếu
            nhập: {receivedNote?.id}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            // onSubmit={handleSubmit(onSubmit)}
            onSubmit={handleSubmit(onSubmit, (err) =>
              console.log("Lỗi đây nè:", err)
            )}
            className="flex flex-1 min-h-0 overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* LEFT SIDE: Danh sách sản phẩm */}
            <div className="flex-[2] flex flex-col min-w-0 border-r border-border bg-muted/5 h-full">
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
                                  {row?.productId}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {field.productName}
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
                          <FormItem>
                            <FormLabel className="font-bold text-foreground">
                              Nhà cung cấp
                            </FormLabel>
                            {/* Thêm key={field.value} ở đây */}
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              defaultValue={receivedNote.providerId}
                              key={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Chọn nhà cung cấp" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {providers.length > 0 ? (
                                  providers.map((prov) => (
                                    <SelectItem
                                      key={prov.id}
                                      value={prov.id.toString()}
                                    >
                                      {prov.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="loading" disabled>
                                    Đang tải...
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
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

                    <Separator className="bg-border" />

                    <div className="space-y-4">
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
                        <span className="font-bold text-sm text-foreground">
                          CẦN TRẢ:
                        </span>
                        <span className="font-bold text-xl text-primary">
                          {formatDisplay(totals.totalAmount)}
                        </span>
                      </div>

                      <FormField
                        control={control}
                        name="paidAmount"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between space-y-0 gap-4 pt-2">
                            <FormLabel className="font-bold text-sm text-foreground">
                              ĐÃ THANH TOÁN:
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
                          Còn nợ:
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

                    <Separator className="bg-border" />

                    <FormField
                      control={control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-sm text-foreground">
                            Ghi chú phiếu
                          </FormLabel>
                          <FormControl>
                            <textarea
                              className="w-full min-h-[80px] p-2 rounded-md border border-input bg-background text-sm focus:ring-1 focus:ring-primary outline-none resize-none text-foreground"
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
                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-6 text-lg shadow-lg"
                >
                  <Save className="mr-2 h-5 w-5" />
                  CẬP NHẬT PHIẾU NHẬP
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
