import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Edit, FileType, Save, Tag } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { renameProduct } from "@/services/api";
import type { Product, ProductType } from "@/types";

// Helper format số cho hiển thị
const formatNumber = (val: number | string) => {
  if (!val && val !== 0) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(val));
};

// Helper parse string format về number
const parseFormattedNumber = (val: string) => {
  return Number(val.replace(/\./g, "").replace(/,/g, ""));
};

interface RenameProductDialogProps {
  product: Product;
  productTypes: ProductType[]; // Bổ sung danh sách nhóm hàng để chọn
  onSuccess?: () => void;
}

function RenameProductDialog({ product, productTypes, onSuccess }: RenameProductDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Schema mở rộng kiểm tra tất cả các trường mới
  const FormSchema = z.object({
    name: z.string().min(1, "Tên hàng hóa không được để trống"),
    productType: z.string().min(1, "Vui lòng chọn nhóm hàng"),
    initialPrice: z.coerce.number().min(0, "Giá vốn không được âm"),
    salePrice: z.coerce.number().min(0, "Giá bán không được âm"),
  });

  type FormValues = z.infer<typeof FormSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: product?.name ?? "",
      productType: product?.productType?.id.toString(),
      initialPrice: product?.initialPrice ?? 0,
      salePrice: product?.salePrice ?? 0,
    },
  });

  // Reset form khi product thay đổi hoặc mở dialog
  // Reset form khi product thay đổi hoặc mở dialog
  useEffect(() => {
    if (isOpen && product) {
      form.reset({
        name: product.name,
        // Đồng bộ chuẩn xác giá trị nhóm hàng hiện tại lên Select Component
        productType: product.productType?.id.toString(),
        initialPrice: product.initialPrice ?? 0,
        salePrice: product.salePrice ?? 0,
      });
    }
  }, [product, form, isOpen]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // Gọi hàm renameProduct với object params mở rộng theo đúng ghi nhớ
      await renameProduct(product.id, {
        name: data.name,
        productTypeId: Number(data.productType), // Ép về kiểu number cho DB
        initialPrice: data.initialPrice,
        salePrice: data.salePrice,
      });

      toast.success("Cập nhật thông tin hàng hóa thành công!");
      if (onSuccess) onSuccess();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Lỗi khi cập nhật product:", error);
      const errorMessage =
        error.response?.data?.message || "Không thể cập nhật thông tin hàng hóa";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="link"
          size="sm"
          className="h-8 w-full justify-start px-2 font-normal text-foreground hover:no-underline"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa hàng hóa
        </Button>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[550px] p-0 gap-0 overflow-hidden border-border shadow-2xl bg-background flex flex-col max-h-[90vh]"
        onPointerDownCapture={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col h-full overflow-hidden"
          >
            {/* Header Section */}
            <div className="p-6 bg-primary text-primary-foreground shrink-0">
              <DialogHeader>
                <div className="flex items-center gap-4 text-left">
                  <div className="p-2 bg-primary-foreground/20 rounded-lg shrink-0">
                    <FileType className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold">
                      Chỉnh sửa thông tin hàng hóa
                    </DialogTitle>
                    <DialogDescription className="text-primary-foreground/80 italic line-clamp-1">
                      ID: <span className="font-mono">{product.id}</span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            {/* Current Context Banner */}
            <div className="px-6 py-3 bg-muted/50 flex items-center gap-3 border-b border-border shrink-0">
              <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">
                  Tên hiện tại
                </p>
                <p className="text-xs font-medium truncate text-muted-foreground">
                  {product.name}
                </p>
              </div>
            </div>

            {/* Form Fields - Bọc trong vùng có thể scroll phòng khi màn hình nhỏ */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Trường nhập Tên hàng hóa */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-primary">
                      Tên hàng hóa mới
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nhập tên hàng hóa mới..."
                        className="h-10 font-medium border-input focus-visible:ring-primary"
                        {...field}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Trường chọn Nhóm hàng */}
              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-primary">
                      Nhóm hàng
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 border-border focus:ring-primary">
                          <SelectValue placeholder="Chọn nhóm hàng" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productTypes.map((type) => (
                          <SelectItem
                            key={type.id}
                            value={type.id.toString()}
                          >
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Khối cấu hình Giá bán & Giá vốn (Chia làm 2 cột) */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <FormField
                  control={form.control}
                  name="initialPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-primary">
                        Giá vốn chung (đ)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          className="h-10 text-right font-medium border-border focus-visible:ring-primary"
                          value={formatNumber(field.value)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            field.onChange(
                              parseFormattedNumber(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-primary">
                        Giá bán chung (đ)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          className="h-10 text-right font-bold text-primary border-border focus-visible:ring-primary"
                          value={formatNumber(field.value)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            field.onChange(
                              parseFormattedNumber(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <p className="text-[11px] text-muted-foreground pt-2 border-t border-dashed border-border">
                💡 <b>Lưu ý hệ thống:</b> Khi bạn thay đổi Nhóm hàng, Giá vốn hoặc Giá bán tại đây, toàn bộ các biến thể con (nếu có) thuộc mã hàng hóa này sẽ được đồng bộ tự động theo mức cấu hình mới.
              </p>
            </div>

            {/* Footer Section */}
            <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3 shrink-0">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  type="button"
                  className="px-5 h-10 font-semibold border-border"
                >
                  Hủy
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 h-10 shadow-lg shadow-primary/20 font-bold gap-2 min-w-[140px]"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Đang cập nhật...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Lưu thay đổi
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default RenameProductDialog;