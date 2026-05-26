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
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Plus, Loader2 } from "lucide-react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  // mockAttributeTypes,
  // mockAttributes,
  // MOCK_PRODUCT_TYPES,
  type AttributeType,
  type ProductType,
  type Attribute,
} from "@/types";
import TagCombobox from "../ui/TagCombobox";
import {
  createAttribute,
  createProduct,
  type CreateProductParams,
} from "@/services/api";
import { toast } from "sonner";

// Helper format số cho hiển thị
const formatNumber = (val: number | string) => {
  if (!val && val !== 0) return "";
  return new Intl.NumberFormat("vi-VN").format(Number(val));
};

// Helper parse string format về number
const parseFormattedNumber = (val: string) => {
  return Number(val.replace(/\./g, "").replace(/,/g, ""));
};

interface ManageAttributeTypesProps {
  attributeTypes: AttributeType[];

  productTypes: ProductType[];

  attributes: Attribute[];

  onSuccess?: () => void;
  refetchAttributes?: () => void;
}

function AddNewProduct({
  attributeTypes,
  productTypes,

  attributes,
  onSuccess,
  refetchAttributes,
}: ManageAttributeTypesProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const FormSchema = z.object({
    prefix: z.string().max(5, "Mã tiền tố tối đa 5 ký tự").optional(),
    name: z.string().min(1, "Tên hàng là bắt buộc"),
    productTypeId: z.string().min(1, "Vui lòng chọn nhóm hàng"),
    initialPrice: z.coerce.number().min(0, "Giá vốn không được âm"),
    salePrice: z.coerce.number().min(0, "Giá bán không được âm"),
    description: z.string().optional(),
    // Sửa đoạn này trong FormSchema
    attributes: z.array(
      z.object({
        typeId: z.coerce.string(), // Thêm .coerce ở đây
        typeName: z.string(),
        selectedValues: z.array(
          z.object({
            id: z.coerce.string(), // Nên làm tương tự với id của value
            name: z.string(),
          })
        ),
      })
    ),
    variants: z.array(
      z.object({
        name: z.string(),
        initialPrice: z.number(),
        salePrice: z.number(),
      })
    ),
  });

  type FormValues = z.infer<typeof FormSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      prefix: "",
      name: "",
      productTypeId: "",
      initialPrice: 0,
      salePrice: 0,
      description: "",
      attributes: attributeTypes.map((type) => ({
        typeId: String(type.id), // Ép kiểu sang String ở đây
        typeName: type.name,
        selectedValues: [],
      })),
      variants: [],
    },
  });
  // Sửa useEffect khởi tạo
  const { fields: attributeFields, replace: replaceAttributes } = useFieldArray(
    {
      control: form.control,
      name: "attributes",
    }
  );
  useEffect(() => {
    if (attributeTypes && attributeTypes.length > 0) {
      const newAttributes = attributeTypes.map((type) => ({
        typeId: String(type.id),
        typeName: type.name,
        selectedValues: [],
      }));

      // Chỉ replace khi độ dài khác nhau để tránh loop
      if (attributeFields.length !== newAttributes.length) {
        replaceAttributes(newAttributes);
      }
    }
  }, [attributeTypes, replaceAttributes, attributeFields.length]);

  const { fields: variantFields, replace: replaceVariants } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const watchInitialPrice = useWatch({
    control: form.control,
    name: "initialPrice",
  });
  const watchSalePrice = useWatch({ control: form.control, name: "salePrice" });

  const isReadyToCreate = useMemo(
    () => variantFields.length > 0,
    [variantFields]
  );

  // Logic tạo biến thể tự động
  // 1. Chỉ watch sâu vào trường attributes để tránh bị trigger bởi các field khác không liên quan
  const watchAttributes = useWatch({
    control: form.control,
    name: "attributes",
  });

  // 2. Dùng JSON.stringify để so sánh giá trị thực tế thay vì tham chiếu
  const attributesSnapshot = JSON.stringify(watchAttributes);

  useEffect(() => {
    // Parse lại data từ snapshot
    const currentAttrs = JSON.parse(
      attributesSnapshot
    ) as typeof watchAttributes;

    const activeAttrs = currentAttrs?.filter(
      (a) => a.selectedValues && a.selectedValues.length > 0
    );

    if (!activeAttrs || activeAttrs.length === 0) {
      // Chỉ replace nếu danh sách hiện tại đang có dữ liệu (tránh gọi vô ích)
      if (variantFields.length > 0) replaceVariants([]);
      return;
    }

    // Tính toán combinations
    const combinations = activeAttrs.reduce((acc, attr) => {
      const next: any[] = [];
      attr.selectedValues.forEach((val) => {
        if (acc.length === 0) next.push([val.name]);
        else acc.forEach((prev: string[]) => next.push([...prev, val.name]));
      });
      return next;
    }, [] as string[][]);

    const newVariants = combinations.map((combo) => ({
      name: combo.join(" - "),
      initialPrice: watchInitialPrice || 0,
      salePrice: watchSalePrice || 0,
    }));

    // Cực kỳ quan trọng: So sánh nội dung variants mới với variants cũ
    // Nếu giống hệt nhau thì không replace để ngắt vòng lặp
    const currentVariantsNames = variantFields.map((v) => v.name).join("|");
    const newVariantsNames = newVariants.map((v) => v.name).join("|");

    if (currentVariantsNames !== newVariantsNames) {
      replaceVariants(newVariants);
    }

    // Thêm variantFields.length vào để kiểm tra trạng thái cũ
  }, [
    attributesSnapshot,
    watchInitialPrice,
    watchSalePrice,
    replaceVariants,
    variantFields.length,
  ]);

  const onSubmit = async (data: FormValues) => {
    // 1. Log toàn bộ giá trị nhận được từ form
    // console.log("--- Form Data Raw ---");
    // console.log(data);

    try {
      setLoading(true);

      const apiAttributes = data.attributes
        .filter((attr) => attr.selectedValues.length > 0)
        .map((attr) =>
          attr.selectedValues.map((val) => ({
            id: val.id,
            value: val.name,
          }))
        );

      const payload: CreateProductParams = {
        prefix: data.prefix,
        name: data.name,
        productTypeId: data.productTypeId,
        brandId: "1",
        initialPrice: data.initialPrice,
        salePrice: data.salePrice,
        description: data.description || "",
        attributes: apiAttributes,
      };

      // 2. Log payload cuối cùng sẽ gửi lên Server
      // console.log("--- API Payload ---");
      // console.log(payload);

      await createProduct(payload);

      toast.success("Tạo thành công", {
        description: `Đã tạo sản phẩm ${data.name} với ${variantFields.length} biến thể.`,
      });
      if (onSuccess) {
        onSuccess();
      }
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Submission Error:", error); // Log lỗi nếu có
      toast.error("Lỗi", {
        description: `Không thể tạo sản phẩm. Vui lòng thử lại sau.`,
      });
    } finally {
      setLoading(false);
    }
  };

  // const handleCreateAttribute = async (value: string, typeId: string) => {
  //   try {
  //     const newAttr = await createAttribute({
  //       attributeTypeId: typeId,
  //       value: value,
  //     });

  //     toast.success(`Đã thêm giá trị "${value}"`);

  //     // Quan trọng: Sau khi tạo thành công ở Server, bạn cần cập nhật lại list attributes
  //     // đang hiển thị ở component này. Thông thường là gọi lại API lấy danh sách ở component cha.
  //     if (refetchAttributes) refetchAttributes();

  //     return newAttr; // Trả về để Combobox có thể chọn luôn giá trị vừa tạo
  //   } catch (error) {
  //     toast.error("Không thể thêm thuộc tính mới");
  //   }
  // };

  // Hàm xử lý tạo nhanh ngay tại chỗ
  const handleCreateAttribute = async (
    value: string,
    typeId: string,
    currentSelected: any[],
    onChange: (val: any[]) => void
  ) => {
    try {
      // Ép kiểu 'any' ở đây để vượt qua kiểm tra của TS nếu bạn chưa rảnh update interface
      const response = (await createAttribute({
        attributeTypeId: typeId,
        value: value,
      })) as any;

      // Lấy ID và Value từ response (kiểm tra lại cấu trúc trả về của Server nhé)
      const newId = response.id || response.data?.id;
      const newValue = response.value || response.data?.value || value;

      const newAttrFormatted = {
        id: String(newId),
        name: newValue,
      };

      // Cập nhật form: Thêm cái mới vào danh sách đang chọn
      onChange([...currentSelected, newAttrFormatted]);

      toast.success(`Đã thêm và chọn: ${value}`);

      if (refetchAttributes) refetchAttributes();
    } catch (error) {
      console.error(error);
      toast.error("Không thể tạo thuộc tính mới");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={"ghost"}
          className="hover:bg-accent hover:text-accent-foreground text-foreground"
        >
          <Plus className="mr-2 h-4 w-4" /> Tạo mới
        </Button>
      </DialogTrigger>

      <DialogContent className="min-w-[950px] max-w-[95vw] h-[90vh] flex flex-col p-0 gap-0 border-border bg-background">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col h-full"
          >
            <div className="p-6 pb-2">
              <DialogHeader>
                <DialogTitle className="text-foreground text-xl">
                  Thêm hàng hóa mới
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Nhập thông tin chi tiết. Hệ thống sẽ tự tạo các biến thể dựa
                  trên thuộc tính bạn chọn.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto p-6 pt-2">
              <div className="space-y-6">
                {/* --- THÔNG TIN CHUNG --- */}
                <FormField
                  control={form.control}
                  name="prefix"
                  render={({ field }) => (
                    <FormItem className="col-span-1">
                      <FormLabel className="text-foreground after:content-['*'] after:ml-0.5 after:text-destructive font-medium">
                        Tiền tố mã (Prefix){" "}
                        {/* Có thể đổi label cho rõ nghĩa */}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="VD: BNLS"
                          {...field}
                          maxLength={5} // Giới hạn ngay tại ô nhập liệu
                          className="border-border focus-visible:ring-primary uppercase" // Thêm uppercase nếu muốn mã luôn viết hoa
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          } // Tùy chọn: Tự động viết hoa
                        />
                      </FormControl>
                      <FormMessage className="text-destructive text-xs" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <FormItem className="col-span-2">
                    <FormLabel className="text-foreground after:content-['*'] after:ml-0.5 after:text-destructive font-medium">
                      Mã hàng
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Mã tự động"
                        disabled
                        className="bg-muted text-muted-foreground border-border"
                      />
                    </FormControl>
                  </FormItem>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-1">
                        <FormLabel className="text-foreground after:content-['*'] after:ml-0.5 after:text-destructive font-medium">
                          Tên hàng
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="VD: Áo sơ mi nam"
                            {...field}
                            className="border-border focus-visible:ring-primary"
                          />
                        </FormControl>
                        <FormMessage className="text-destructive text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productTypeId"
                    render={({ field }) => (
                      <FormItem className="col-span-1">
                        <FormLabel className="text-foreground font-medium">
                          Nhóm hàng
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger className="border-border focus:ring-primary">
                              <SelectValue placeholder="Chọn nhóm" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {productTypes.map((type) => (
                              <SelectItem
                                key={type.id}
                                value={type.id.toString()} // Ép kiểu string ở đây
                              >
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-foreground font-medium">
                          Mô tả
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Thông tin chi tiết về sản phẩm..."
                            className="border-border focus-visible:ring-primary resize-none"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* --- GIÁ VỐN GIÁ BÁN --- */}
                <Accordion
                  type="single"
                  collapsible
                  defaultValue="prices"
                  className="border-t border-border"
                >
                  <AccordionItem value="prices" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-4 group">
                      <div className="flex flex-col items-start text-left">
                        <span className="text-md font-bold text-foreground group-hover:text-primary transition-colors">
                          Giá vốn & Giá bán
                        </span>
                        <span className="text-xs text-muted-foreground font-normal">
                          Thiết lập mức giá chung để áp dụng nhanh
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="grid grid-cols-2 gap-4 pt-0 pb-4">
                      <FormField
                        control={form.control}
                        name="initialPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">
                              Giá vốn chung
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                className="text-right border-border focus-visible:ring-primary font-medium"
                                value={formatNumber(field.value)}
                                onChange={(e) =>
                                  field.onChange(
                                    parseFormattedNumber(e.target.value)
                                  )
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="salePrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">
                              Giá bán chung
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                className="text-right border-border focus-visible:ring-primary font-medium text-primary"
                                value={formatNumber(field.value)}
                                onChange={(e) =>
                                  field.onChange(
                                    parseFormattedNumber(e.target.value)
                                  )
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* --- THUỘC TÍNH --- */}
                <Accordion
                  type="single"
                  collapsible
                  defaultValue="attributes"
                  className="border-t border-border"
                >
                  <AccordionItem value="attributes" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-4 group">
                      <div className="flex flex-col items-start text-left">
                        <span className="text-md font-bold text-foreground group-hover:text-primary transition-colors">
                          Thuộc tính (Phân loại)
                        </span>
                        <span className="text-xs text-muted-foreground font-normal">
                          Chọn các giá trị để tạo ra các biến thể sản phẩm
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      {form.getValues("attributes").map((item, index) => (
                        <div
                          key={item.typeId}
                          className="flex gap-4 items-center bg-accent/20 p-4 rounded-lg border border-border"
                        >
                          <div className="w-1/4">
                            <span className="text-sm font-bold text-primary uppercase tracking-tight">
                              {item.typeName}
                            </span>
                          </div>

                          <FormField
                            control={form.control}
                            name={`attributes.${index}.selectedValues`}
                            render={({ field }) => (
                              <div className="flex-1">
                                <TagCombobox
                                  options={attributes
                                    .filter(
                                      (attr) =>
                                        // Ép cả 2 về String để đảm bảo phép so sánh luôn chính xác
                                        String(attr.attributeType?.id) ===
                                        String(item.typeId)
                                    )
                                    .map((a) => ({
                                      id: String(a.id), // Ép id về string cho đồng bộ với TagCombobox
                                      name: a.value,
                                    }))}
                                  selected={field.value || []}
                                  onChange={field.onChange}
                                  onAdd={(newValue) =>
                                    handleCreateAttribute(
                                      newValue,
                                      item.typeId,
                                      field.value || [],
                                      field.onChange // Truyền hàm này để nó set state cho form luôn
                                    )
                                  }
                                  placeholder={`Chọn ${item.typeName}...`}
                                />
                              </div>
                            )}
                          />
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* --- BẢNG BIẾN THỂ --- */}
                {variantFields.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-md font-bold text-foreground uppercase tracking-wider">
                          Danh sách biến thể
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Hệ thống tự động sinh {variantFields.length} mã hàng
                        </span>
                      </div>
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="w-[350px] text-foreground font-bold">
                              Tên biến thể
                            </TableHead>
                            <TableHead className="text-foreground font-bold text-right">
                              Giá vốn (đ)
                            </TableHead>
                            <TableHead className="text-foreground font-bold text-right">
                              Giá bán (đ)
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {variantFields.map((v, vIndex) => (
                            <TableRow
                              key={v.id}
                              className="border-border hover:bg-accent/5 transition-colors"
                            >
                              <TableCell className="font-semibold text-primary py-3">
                                {v.name}
                              </TableCell>
                              <TableCell className="py-2">
                                <FormField
                                  control={form.control}
                                  name={`variants.${vIndex}.initialPrice`}
                                  render={({ field }) => (
                                    <Input
                                      type="text"
                                      disabled
                                      className="h-9 text-right border-border focus-visible:ring-primary"
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
                              <TableCell className="py-2">
                                <FormField
                                  control={form.control}
                                  name={`variants.${vIndex}.salePrice`}
                                  render={({ field }) => (
                                    <Input
                                      type="text"
                                      className="h-9 text-right border-border focus-visible:ring-primary text-primary font-medium"
                                      value={formatNumber(field.value)}
                                      disabled
                                      onChange={(e) =>
                                        field.onChange(
                                          parseFormattedNumber(e.target.value)
                                        )
                                      }
                                    />
                                  )}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-border bg-background">
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="border-border hover:bg-accent text-foreground"
                  >
                    Hủy bỏ
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={!isReadyToCreate || loading}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[180px] font-bold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử
                      lý...
                    </>
                  ) : isReadyToCreate ? (
                    `Tạo ${variantFields.length} sản phẩm`
                  ) : (
                    "Vui lòng chọn thuộc tính"
                  )}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default AddNewProduct;
