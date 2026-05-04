import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import z from "zod";
import { Button } from "../ui/button";
import { Plus, Loader2, Layers, AlertCircle } from "lucide-react";
import { Input } from "../ui/input";
import { type AttributeType, type Attribute, type Product } from "@/types";
import TagCombobox from "../ui/TagCombobox";
import { createAttribute } from "@/services/api";
import { toast } from "sonner";

// Helper format số
const formatNumber = (val: number | string) => {
  if (!val && val !== 0) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(val));
};

const parseFormattedNumber = (val: string) => {
  return Number(val.replace(/\./g, "").replace(/,/g, ""));
};

interface AddMoreVariantsProps {
  product: Product;
  attributeTypes: AttributeType[];
  attributes: Attribute[];
  onSuccess?: () => void;
  refetchAttributes?: () => void;
}

function AddMoreVariantsDialog({
  product,
  attributeTypes,
  attributes,
  onSuccess,
  refetchAttributes,
}: AddMoreVariantsProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const existingVariantNames = useMemo(() => {
    return product.variants?.map((v: any) => v.name.toLowerCase()) || [];
  }, [product]);

  // Cập nhật Schema: Đảm bảo isExisting luôn là boolean để tránh lỗi Type Resolver
  const FormSchema = z.object({
    initialPrice: z.coerce.number().min(0),
    salePrice: z.coerce.number().min(0),
    attributes: z.array(
      z.object({
        typeId: z.string(),
        typeName: z.string(),
        selectedValues: z.array(z.object({ id: z.string(), name: z.string() })),
      })
    ),
    variants: z.array(
      z.object({
        name: z.string(),
        initialPrice: z.number(),
        salePrice: z.number(),
        isExisting: z.boolean(), // Bỏ default ở đây, sẽ set giá trị khi gen variants
      })
    ),
  });

  type FormValues = z.infer<typeof FormSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      initialPrice: product.initialPrice || 0,
      salePrice: product.salePrice || 0,
      attributes: attributeTypes.map((type) => ({
        typeId: String(type.id),
        typeName: type.name,
        selectedValues: [],
      })),
      variants: [],
    },
  });

  const { fields: variantFields, replace: replaceVariants } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const watchInitialPrice = useWatch({
    control: form.control,
    name: "initialPrice",
  });
  const watchSalePrice = useWatch({ control: form.control, name: "salePrice" });
  const watchAttributes = useWatch({
    control: form.control,
    name: "attributes",
  });

  useEffect(() => {
    const activeAttrs = watchAttributes?.filter(
      (a) => a.selectedValues && a.selectedValues.length > 0
    );

    if (!activeAttrs || activeAttrs.length === 0) {
      if (variantFields.length > 0) replaceVariants([]);
      return;
    }

    const combinations = activeAttrs.reduce((acc, attr) => {
      const next: any[] = [];
      attr.selectedValues.forEach((val) => {
        if (acc.length === 0) next.push([val.name]);
        else acc.forEach((prev: string[]) => next.push([...prev, val.name]));
      });
      return next;
    }, [] as string[][]);

    const newVariants = combinations.map((combo) => {
      const name = combo.join(" - ");
      return {
        name,
        initialPrice: watchInitialPrice || 0,
        salePrice: watchSalePrice || 0,
        isExisting: existingVariantNames.includes(name.toLowerCase()),
      };
    });

    const currentHash = variantFields.map((v) => v.name).join("|");
    const newHash = newVariants.map((v) => v.name).join("|");

    if (currentHash !== newHash) {
      replaceVariants(newVariants);
    }
  }, [
    watchAttributes,
    watchInitialPrice,
    watchSalePrice,
    existingVariantNames,
    replaceVariants,
  ]);

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      const variantsToCreate = data.variants.filter((v) => !v.isExisting);

      if (variantsToCreate.length === 0) {
        toast.error("Không có biến thể mới nào để thêm");
        return;
      }

      const apiAttributes = data.attributes
        .filter((attr) => attr.selectedValues.length > 0)
        .map((attr) =>
          attr.selectedValues.map((val) => ({ id: val.id, value: val.name }))
        );

      //   await addVariantsToProduct(product.id, {
      //     attributes: apiAttributes,
      //     variants: variantsToCreate.map(({ name, initialPrice, salePrice }) => ({
      //       name, initialPrice, salePrice
      //     })),
      //   });

      toast.success("Thành công", {
        description: `Đã thêm ${variantsToCreate.length} biến thể.`,
      });
      if (onSuccess) onSuccess();
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error("Lỗi khi gửi dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAttribute = async (
    value: string,
    typeId: string,
    current: any[],
    onChange: any
  ) => {
    try {
      const response = (await createAttribute({
        attributeTypeId: typeId,
        value,
      })) as any;
      const newAttr = {
        id: String(response.id || response.data?.id),
        name: value,
      };
      onChange([...current, newAttr]);
      if (refetchAttributes) refetchAttributes();
    } catch (error) {
      toast.error("Lỗi tạo thuộc tính mới");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start px-2 font-normal hover:bg-accent hover:text-accent-foreground text-foreground"
        >
          <Plus className="mr-2 h-4 w-4" /> Thêm biến thể
        </Button>
      </DialogTrigger>

      <DialogContent className="min-w-[900px] max-w-[90vw] h-[85vh] flex flex-col p-0 gap-0 border-border bg-background">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col h-full"
          >
            <div className="p-6 border-b border-border bg-card">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Layers className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-foreground">
                      Thêm biến thể: {product.name}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      Tổ hợp các thuộc tính để tạo mã hàng mới.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* PHẦN CHỌN THUỘC TÍNH */}
              <div className="space-y-4">
                <h3 className="font-bold flex items-center gap-2 uppercase text-[11px] tracking-widest text-muted-foreground">
                  Cấu hình thuộc tính
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {form.getValues("attributes").map((item, index) => (
                    <div
                      key={item.typeId}
                      className="flex gap-4 items-center bg-accent/20 p-4 rounded-xl border border-border"
                    >
                      <div className="w-32 font-bold text-sm text-primary uppercase">
                        {item.typeName}
                      </div>
                      <FormField
                        control={form.control}
                        name={`attributes.${index}.selectedValues`}
                        render={({ field }) => (
                          <div className="flex-1">
                            <TagCombobox
                              options={attributes
                                .filter(
                                  (a) =>
                                    String(a.attributeType?.id) ===
                                    String(item.typeId)
                                )
                                .map((a) => ({
                                  id: String(a.id),
                                  name: a.value,
                                }))}
                              selected={field.value || []}
                              onChange={field.onChange}
                              onAdd={(val) =>
                                handleCreateAttribute(
                                  val,
                                  item.typeId,
                                  field.value,
                                  field.onChange
                                )
                              }
                              placeholder={`Chọn ${item.typeName}...`}
                            />
                          </div>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* BẢNG BIẾN THỂ */}
              {variantFields.length > 0 && (
                <div className="pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold uppercase text-[11px] tracking-widest text-muted-foreground">
                      Danh sách biến thể dự kiến
                    </h3>
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="font-bold text-foreground">
                            Tên biến thể
                          </TableHead>
                          <TableHead className="w-32 text-right font-bold text-foreground">
                            Giá vốn
                          </TableHead>
                          <TableHead className="w-32 text-right font-bold text-foreground">
                            Giá bán
                          </TableHead>
                          <TableHead className="w-24 text-center font-bold text-foreground">
                            Trạng thái
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {variantFields.map((v, vIndex) => (
                          <TableRow
                            key={v.id}
                            className={`${
                              v.isExisting
                                ? "opacity-40 bg-muted/30"
                                : "hover:bg-accent/5"
                            } border-border transition-colors`}
                          >
                            <TableCell className="font-semibold text-primary">
                              {v.name}
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`variants.${vIndex}.initialPrice`}
                                render={({ field }) => (
                                  <Input
                                    disabled
                                    className="h-8 text-right border-border focus-visible:ring-primary"
                                    value={formatNumber(field.value)}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseFormattedNumber(e.target.value)
                                      )
                                    }
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`variants.${vIndex}.salePrice`}
                                
                                render={({ field }) => (
                                  <Input
                                    disabled
                                    className="h-8 text-right text-primary font-bold border-border focus-visible:ring-primary"
                                    value={formatNumber(field.value)}
                                    onChange={(e) =>
                                      field.onChange(
                                        parseFormattedNumber(e.target.value)
                                      )
                                    }
                                  />
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              {v.isExisting ? (
                                <span className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded text-muted-foreground font-bold uppercase">
                                  Đã có
                                </span>
                              ) : (
                                <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded font-bold uppercase">
                                  Mới
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border bg-background">
              <DialogFooter className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  Sẽ thêm{" "}
                  <span className="text-foreground font-bold underline underline-offset-4">
                    {variantFields.filter((v) => !v.isExisting).length}
                  </span>{" "}
                  biến thể mới
                </div>
                <div className="flex gap-2">
                  <DialogClose asChild>
                    <Button
                      variant="outline"
                      type="button"
                      className="border-border"
                    >
                      Hủy
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={
                      loading ||
                      variantFields.filter((v) => !v.isExisting).length === 0
                    }
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold min-w-[140px]"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Lưu thay đổi
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default AddMoreVariantsDialog;
