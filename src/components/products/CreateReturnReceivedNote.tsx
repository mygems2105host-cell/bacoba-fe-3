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
import { Plus, Trash2, PackageMinus } from "lucide-react";
import {
  createReturnReceivedNote,
  getProviders,
  getSearchedProducts,
} from "@/services/api";
import { toast } from "sonner";
import type { Provider } from "@/types";
import { SingleCombobox } from "../ui/SingleCombobox";

interface CreateReturnReceivedNoteProps {
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
        stockQuantity: z.number(),
        addQuantity: z.number().min(1, "Tối thiểu 1"),
        price: z.number().min(0),
        discount: z.number().min(0),
      })
    )
    .min(1, "Chưa có sản phẩm nào trong phiếu trả hàng")
    .superRefine((products, ctx) => {
      products.forEach((prod, index) => {
        if (prod.addQuantity > prod.stockQuantity) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Vượt tồn kho (Tối đa: ${prod.stockQuantity})`, // Đã rút ngắn gọn
            path: [index, "addQuantity"],
          });
        }
      });
    }),
  totalDiscount: z.number().min(0),
  paidAmount: z.number().min(0),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateReturnReceivedNote({
  onSuccess,
}: CreateReturnReceivedNoteProps) {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
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
      console.error("Lỗi khi tải dữ liệu nhà cung cấp:", error);
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

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = form;
  const { fields, remove, append } = useFieldArray({
    control,
    name: "receivedProducts",
  });

  const watchedProducts = useWatch({ control, name: "receivedProducts" });
  const watchedTotalDiscount = useWatch({ control, name: "totalDiscount" });
  const watchedPaidAmount = useWatch({ control, name: "paidAmount" });

  const totals = useMemo(() => {
    let totalQuantity = 0;
    const subTotal = (watchedProducts || []).reduce((sum, item) => {
      const qty = item?.addQuantity || 0;
      const price = item?.price || 0;
      const disc = item?.discount || 0;
      totalQuantity += qty;
      return sum + (price - disc) * qty;
    }, 0);
    const totalAmount = subTotal - (watchedTotalDiscount || 0);
    const debt = totalAmount - (watchedPaidAmount || 0);
    return { subTotal, totalAmount, totalQuantity, debt };
  }, [watchedProducts, watchedTotalDiscount, watchedPaidAmount]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") e.preventDefault();
  };

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
          const results = response.data.flatMap((parent: any) =>
            parent.variants && Array.isArray(parent.variants)
              ? parent.variants
              : [parent]
          );
          setSearchResults(results);
        }
      } catch (error) {
        console.error("Lỗi search API sản phẩm:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleAddProductFromSearch = (product: any) => {
    const currentProducts = getValues("receivedProducts") || [];
    const existingIdx = currentProducts.findIndex((p) => p.id === product.id);

    if (existingIdx > -1) {
      const currentQty = currentProducts[existingIdx].addQuantity || 0;
      setValue(`receivedProducts.${existingIdx}.addQuantity`, currentQty + 1);
    } else {
      append({
        id: product.id,
        name: product.name,
        stockQuantity: product.quantity ?? 0,
        addQuantity: 1,
        price: product.initialPrice || product.salePrice || 0,
        discount: 0,
      });
    }

    setSearchTerm("");
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const apiParams = {
        providerId: data.providerId,
        phoneNumber: "",
        description: data.description || "",
        discount: data.totalDiscount,
        payedMoney: data.paidAmount,
        debtMoney: totals.debt,
        total: totals.totalAmount,
        // LƯU Ý: Thường tạo mới thành công sẽ là "completed" thay vì "cancelled"
        status: "returned" as const,
        createdAt: data.createdAt
          ? new Date(data.createdAt).toISOString()
          : new Date().toISOString(),
        receivedProducts: data.receivedProducts.map((p) => ({
          productId: p.id,
          addQuantity: p.addQuantity,
          discount: p.discount,
          description: p.name,
          total: (p.price - p.discount) * p.addQuantity,
        })),
      };

      const response = await createReturnReceivedNote(apiParams);

      if (response.success) {
        toast.success("Tạo phiếu xuất trả hàng thành công!");
        if (onSuccess) {
          onSuccess();
        }
        form.reset();
        setOpen(false);
      } else {
        toast.error(response?.message || "Tạo phiếu không thành công.");
      }
    } catch (error: any) {
      console.error("Lỗi khi tạo phiếu trả hàng:", error);
      toast.error(
        error?.response?.data?.message || "Có lỗi xảy ra khi hoàn tất trả hàng."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-destructive text-destructive hover:bg-destructive/10 transition-colors"
        >
          <PackageMinus className="mr-2 h-4 w-4" /> Trả hàng nhà cung cấp
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[95vw] min-w-[95vw] h-[90vh] flex flex-col p-0 bg-background border-border shadow-2xl text-foreground overflow-hidden">
        <DialogHeader className="p-4 border-b border-border bg-card shrink-0">
          <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
            <PackageMinus className="text-destructive h-5 w-5" /> Tạo phiếu trả
            hàng nhà cung cấp
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-1 min-h-0 overflow-hidden"
            onKeyDown={handleKeyDown}
          >
            {/* LEFT SIDE */}
            <div className="flex-[2] flex flex-col min-w-0 border-r border-border bg-muted/10 h-full">
              <div className="p-4 bg-background border-b border-border shrink-0 relative z-50">
                <div className="relative">
                  <Input
                    ref={searchInputRef}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() =>
                      setTimeout(() => setIsSearchFocused(false), 300)
                    }
                    placeholder="Tìm sản phẩm xuất trả (Mã, tên, barcode)..."
                    className="pl-10 bg-background border-input focus-visible:ring-primary"
                  />
                  <Plus className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>

                {isSearching ? (
                  <div className="absolute top-full left-4 right-4 bg-card border border-border p-3 shadow-lg z-[100] text-sm text-muted-foreground">
                    Đang tìm kiếm sản phẩm...
                  </div>
                ) : (
                  isSearchFocused &&
                  searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border shadow-2xl z-[100] max-h-60 overflow-y-auto rounded-md">
                      {searchResults.map((p) => {
                        const isOutOfStock = (p.quantity ?? 0) <= 0; // Kiểm tra tồn kho <= 0

                        return (
                          <div
                            key={p.id}
                            className={`p-3 border-b border-border flex justify-between items-center transition-colors ${
                              isOutOfStock
                                ? "opacity-50 bg-muted/40 cursor-not-allowed select-none"
                                : "hover:bg-primary/5 cursor-pointer"
                            }`}
                            onMouseDown={(e) => {
                              if (isOutOfStock) return; // Không cho click nếu hết hàng
                              e.preventDefault();
                              handleAddProductFromSearch(p);
                            }}
                          >
                            <div className="flex flex-col flex-1 pr-4 min-w-0">
                              {/* Thêm line-clamp-3 để giới hạn tối đa 3 dòng và hiển thị dấu ... nếu dài hơn */}
                              <span
                                className={`text-sm font-bold line-clamp-3 ${
                                  isOutOfStock
                                    ? "text-muted-foreground"
                                    : "text-foreground"
                                }`}
                              >
                                {p.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                Mã: {p.id} | Tồn kho: {p.quantity ?? 0}{" "}
                                {isOutOfStock && (
                                  <span className="text-destructive font-medium">
                                    (Không có hàng trong kho)
                                  </span>
                                )}
                              </span>
                            </div>
                            <span
                              className={`text-sm font-black shrink-0 ${
                                isOutOfStock
                                  ? "text-muted-foreground"
                                  : "text-primary"
                              }`}
                            >
                              {(
                                p.initialPrice ||
                                p.salePrice ||
                                0
                              ).toLocaleString()}{" "}
                              đ
                            </span>
                          </div>
                        );
                      })}
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
                            <TableHead className="w-[260px] font-bold">
                              Tên hàng
                            </TableHead>
                            <TableHead className="text-right font-bold">
                              SL trả
                            </TableHead>
                            <TableHead className="text-right font-bold">
                              Giá trả lại
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
                          {fields.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={8}
                                className="text-center py-10 text-muted-foreground text-sm"
                              >
                                Chưa có sản phẩm nào được chọn. Vui lòng tìm
                                kiếm sản phẩm ở thanh trên để thêm vào phiếu.
                              </TableCell>
                            </TableRow>
                          ) : (
                            fields.map((field, index) => {
                              const row = watchedProducts?.[index];
                              const rowTotal =
                                ((row?.price || 0) - (row?.discount || 0)) *
                                (row?.addQuantity || 0);

                              const hasError =
                                errors.receivedProducts?.[index]?.addQuantity;

                              return (
                                <TableRow
                                  key={field.id}
                                  className={`border-b border-border hover:bg-muted/5 ${
                                    hasError ? "bg-destructive/5" : ""
                                  }`}
                                >
                                  <TableCell className="text-center text-muted-foreground">
                                    {index + 1}
                                  </TableCell>
                                  <TableCell className="font-bold text-primary">
                                    {row?.id}
                                  </TableCell>
                                  <TableCell className="font-medium w-[260px] min-w-[200px] max-w-[280px] p-2">
                                    <span
                                      className="line-clamp-3 block whitespace-normal break-words"
                                      title={field.name}
                                    >
                                      {field.name}
                                    </span>
                                  </TableCell>

                                  <TableCell>
                                    <div className="flex flex-col items-end gap-1">
                                      <Input
                                        value={formatDisplay(
                                          row?.addQuantity ?? 0
                                        )}
                                        onChange={(e) =>
                                          setValue(
                                            `receivedProducts.${index}.addQuantity`,
                                            parseNumber(e.target.value),
                                            { shouldValidate: true }
                                          )
                                        }
                                        className={`w-20 text-right ${
                                          hasError
                                            ? "border-destructive focus-visible:ring-destructive text-destructive font-bold"
                                            : ""
                                        }`}
                                      />
                                      {hasError && (
                                        <span className="text-[10px] text-destructive text-right block max-w-[150px] leading-tight font-medium">
                                          {hasError.message}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={formatDisplay(row?.price ?? 0)}
                                      onChange={(e) =>
                                        setValue(
                                          `receivedProducts.${index}.price`,
                                          parseNumber(e.target.value),
                                          { shouldValidate: true }
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
                                          parseNumber(e.target.value),
                                          { shouldValidate: true }
                                        )
                                      }
                                      className="w-24 ml-auto text-right"
                                    />
                                  </TableCell>
                                  {/* ĐÃ SỬA: Đưa giá trị tổng dòng vào đúng thẻ TableCell */}
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
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* RIGHT SIDE */}
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
                              Nhà cung cấp nhận hàng
                            </FormLabel>
                            <FormControl>
                              <SingleCombobox
                                options={providers.map((p) => ({
                                  id: p.id.toString(),
                                  name: p.name,
                                }))}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Chọn nhà cung cấp hoàn trả..."
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
                              Ngày giờ trả hàng
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
                          Tổng SL xuất trả:
                        </span>
                        <span className="font-semibold">
                          {formatDisplay(totals.totalQuantity)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          Tổng giá trị hàng trả:
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
                        <span className="font-bold text-sm">NCC PHẢI TRẢ:</span>
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
                              NCC ĐÃ TRẢ TIỀN:
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
                          Dư nợ công nợ giảm trừ:
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
                            Lý do / Ghi chú xuất trả
                          </FormLabel>
                          <FormControl>
                            <textarea
                              className="w-full min-h-[80px] p-2 rounded-md border border-input bg-background text-sm focus:ring-1 focus:ring-primary outline-none resize-none"
                              placeholder="Nhập lý do hoàn trả (Hàng lỗi kĩ thuật, cận date, thừa hàng...)..."
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </ScrollArea>
              </div>

              <div className="p-4 border-t border-border bg-background shrink-0 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1 font-bold py-6"
                >
                  HỦY BỎ
                </Button>
                <Button
                  type="submit"
                  className="flex-[2] bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold py-6 text-lg shadow-lg"
                >
                  XÁC NHẬN TRẢ HÀNG
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
