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
import { renameProduct } from "@/services/api";
import type { Product } from "@/types";

interface RenameProductDialogProps {
  product: Product;
  onSuccess?: () => void;
}

function RenameProductDialog({ product, onSuccess }: RenameProductDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Schema kiểm tra tên không được để trống
  const FormSchema = z.object({
    name: z.string().min(1, "Tên hàng hóa không được để trống"),
  });

  type FormValues = z.infer<typeof FormSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: product?.name ?? "",
    },
  });

  // Reset form khi product thay đổi hoặc mở dialog
  useEffect(() => {
    if (isOpen && product) {
      form.reset({
        name: product.name,
      });
    }
  }, [product, form, isOpen]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await renameProduct(product.id, data.name);
      toast.success("Đổi tên hàng hóa thành công!");
      if (onSuccess) onSuccess();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Lỗi khi rename product:", error);
      const errorMessage =
        error.response?.data?.message || "Không thể đổi tên hàng hóa";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {/* Ngăn sự kiện nổi bọt ngay tại trigger nếu nằm trong menu */}
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
        className="sm:max-w-[500px] p-0 gap-0 overflow-hidden border-border shadow-2xl bg-background"
        // Quan trọng: Ngăn sự kiện click từ dialog bắn ra ngoài làm trigger lại dropdown cha
        onPointerDownCapture={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            onKeyDown={(e) => {
              // Ngăn phím Enter đóng Dialog ngoài ý muốn hoặc gây tác động tiêu cực
              if (e.key === "Enter" && !e.shiftKey) {
                // Cho phép form submit tự nhiên
              }
            }}
            className="flex flex-col"
          >
            {/* Header Section - Primary Colors */}
            <div className="p-6 bg-primary text-primary-foreground">
              <DialogHeader>
                <div className="flex items-center gap-4 text-left">
                  <div className="p-2 bg-primary-foreground/20 rounded-lg shrink-0">
                    <FileType className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold">
                      Đổi tên hàng hóa
                    </DialogTitle>
                    <DialogDescription className="text-primary-foreground/80 italic line-clamp-1">
                      ID: <span className="font-mono">{product.id}</span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            {/* Current Context */}
            <div className="px-6 py-4 bg-muted/50 flex items-center gap-3 border-b border-border">
              <Tag className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">
                  Tên hiện tại
                </p>
                <p className="text-sm font-medium truncate">
                  {product.name}
                </p>
              </div>
            </div>

            {/* Input Field Section */}
            <div className="p-8 space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-primary">
                      Tên hàng hóa mới
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Nhập tên hàng hóa mới..."
                          className="h-12 pl-4 font-medium text-base border-input focus-visible:ring-primary"
                          {...field}
                          // Tránh focus bị cướp khi đang gõ
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">
                      Lưu ý: Tên nên bao gồm chủng loại và đặc điểm để dễ tìm
                      kiếm.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Footer Section */}
            <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  type="button"
                  className="px-6 font-semibold border-border"
                >
                  Hủy
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 shadow-lg shadow-primary/20 font-bold gap-2"
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