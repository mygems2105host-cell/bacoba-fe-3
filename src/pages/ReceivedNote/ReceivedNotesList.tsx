import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  // PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import {
  // ArrowRight,
  // Barcode,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  // Edit,
  // Edit3,
  // MoreHorizontal,
  // Plus,
  // Trash2,
  Undo2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React, { useCallback, useEffect, useState } from "react";
// Import từ file mock data của bạn
import { type ReceivedNote } from "@/types/ReceivedNote";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
import TagCombobox from "@/components/ui/TagCombobox";
import { EditReceivedNote } from "@/components/products/EditReceivedNote";
import {
  cancelReceivedNote,
  confirmReceivedNote,
  getReceivedNotes,
} from "@/services/api";
import { toast } from "sonner";
import { BarcodeDialog } from "./BarcodeDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateReturnReceivedNote } from "@/components/products/CreateReturnReceivedNote";
import { getPaginationRange } from "@/lib/pagination";
const ReceivedNotesSkeleton = ({ rows = 5 }: { rows?: number }) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <Skeleton className="h-4 w-4" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-4" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-[100px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-[120px]" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-5 w-[100px] ml-auto" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-5 w-[80px] ml-auto" />
          </TableCell>
          <TableCell className="text-center">
            <Skeleton className="h-6 w-[70px] mx-auto rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8 rounded-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};
function ReceivedNotesList() {
  interface Option {
    id: string;
    name: string;
  }

  const statusOptions: Option[] = [
    { id: "confirm", name: "Đã nhập" },
    { id: "draft", name: "Nháp" },
    { id: "cancelled", name: "Hủy" },
    { id: "returned", name: "Trả hàng" },
  ];

  // 1. Khai báo state cho API
  const [receivedNotes, setReceivedNote] = useState<ReceivedNote[]>([]);
  const [meta, setMeta] = useState({
    totalItems: 0,
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);

  // 2. State cho Filter & UI
  const [selectedStatus, setSelectedStatus] = useState<Option[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  /// 3. Hàm gọi API
  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        // 1. Lấy trang hiện tại từ state meta
        page: meta.currentPage,
        // 2. Lấy số lượng phần tử mỗi trang (hiện tại là 10)
        pageSize: meta.pageSize,
        // 3. Nếu có chữ trong ô search thì gửi, không thì thôi
        search: debouncedSearchQuery.trim() || undefined,
        // 4. Quan trọng: Backend trong ảnh nhận 1 chuỗi status.
        // Vì TagCombobox trả về array nên ta lấy cái đầu tiên.
        status: selectedStatus.length > 0 ? selectedStatus[0].id : undefined,
      };

      const response = await getReceivedNotes(params);

      if (response.success) {
        setReceivedNote(response.data);
        // Chỉ cập nhật meta khi giá trị thực sự khác để tránh re-render
        setMeta((prev) => ({
          ...prev,
          totalPages: response.meta.totalPages,
          totalItems: response.meta.totalItems,
        }));
      }
    } catch (error) {
      console.error("Lỗi gọi API:", error);
      toast.error("Không thể tải dữ liệu");
    } finally {
      setTimeout(() => setIsLoading(false), 100);
    }
  }, [meta.currentPage, meta.pageSize, debouncedSearchQuery, selectedStatus]);

  // 1. Chỉ dùng useEffect này để reset về trang 1 khi filter thay đổi
  useEffect(() => {
    setMeta((prev) =>
      prev.currentPage === 1 ? prev : { ...prev, currentPage: 1 }
    );
  }, [debouncedSearchQuery, selectedStatus]);

  // 2. fetchNotes sẽ chạy khi currentPage HOẶC các filter thay đổi
  // Lưu ý: Nếu meta.currentPage thay đổi do useEffect trên, fetchNotes sẽ tự kích hoạt lại
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Logic lọc dữ liệu dựa trên trạng thái và tìm kiếm
  // const receivedNotes = receivedNotes.filter((note) => {
  //   const matchesStatus =
  //     selectedStatus.length === 0 ||
  //     selectedStatus.some((s) => s.id === note.status);
  //   const matchesSearch = note.id
  //     .toLowerCase()
  //     .includes(searchQuery.toLowerCase());
  //   return matchesStatus && matchesSearch;
  // });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // Đợi 500ms sau khi ngừng gõ

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  const handleSelectRow = (id: string, itemIds: string[]) => {
    const allIds = [id, ...itemIds];
    const isSelected = selectedRows.includes(id);

    if (isSelected) {
      setSelectedRows((prev) => prev.filter((item) => !allIds.includes(item)));
    } else {
      setSelectedRows((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  // --- LOGIC XỬ LÝ API MỚI ---
  const handleConfirm = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xác nhận nhập kho phiếu này?")) return;
    try {
      await confirmReceivedNote(id);
      toast.success("Xác nhận nhập kho thành công");
      fetchNotes(); // Reload dữ liệu
    } catch (error) {
      toast.error("Không thể xác nhận phiếu nhập");
    }
  };

  const handleCancel = async (id: string) => {
    if (
      !confirm("Bạn có chắc chắn muốn hủy phiếu nhập này? (Thao tác Trả hàng)")
    )
      return;
    try {
      await cancelReceivedNote(id);
      toast.success("Đã hủy phiếu nhập thành công");
      fetchNotes(); // Reload dữ liệu
    } catch (error) {
      toast.error("Không thể hủy phiếu nhập");
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "confirm":
        return "text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-semibold";
      case "draft":
        return "text-blue-600 bg-blue-50 px-2 py-1 rounded-full text-xs font-semibold";
      case "cancelled":
        return "text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-semibold";
      case "returned":
        return "text-foreground bg-secondary px-2 py-1 rounded-full text-xs font-semibold";
      default:
        return "";
    }
  };

  return (
    <div className="w-full h-full p-5 flex flex-wrap gap-y-6">
      <div className="basis-1/4 ">
        <div className="basis-full flex flex-wrap">
          <p className="text-2xl font-bold">Nhập hàng</p>
        </div>
      </div>
      <div className="basis-3/4 flex flex-wrap justify-between">
        <div className="basis-1/2 relative">
          <Input
            type="text" // Chuyển sang text để custom icon dễ hơn nếu muốn
            placeholder="Tìm theo mã phiếu nhập (PN...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </div>
        <div className="basis-1/3 flex justify-around items-center">
          {/* <Button variant={"outline"}>
            Nhập hàng <ArrowRight className="ml-2 h-4 w-4" />{" "}
          </Button> */}
          <CreateReturnReceivedNote onSuccess={fetchNotes} />
        </div>
      </div>

      <div className="basis-1/4 w-full px-5 ">
        <div className="basis-full w-full flex flex-wrap">
          <div className="basis-full w-full">
            <p className="basis-full text-sm font-bold py-3 ">Trạng thái</p>
            <TagCombobox
              options={statusOptions}
              selected={selectedStatus}
              onChange={(val) => setSelectedStatus(val)}
              placeholder="Chọn trạng thái..."
            />
          </div>
        </div>
      </div>

      <div className="basis-3/4 min-h-[calc(100vh-200px)] flex flex-col justify-between">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    receivedNotes.length > 0 &&
                    receivedNotes.every((n) => selectedRows.includes(n.id))
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      const allIds = receivedNotes.flatMap((n) => [
                        n.id,
                        ...(n.receivedProducts?.map((p) => p.id) || []),
                      ]);
                      setSelectedRows(
                        Array.from(new Set([...selectedRows, ...allIds]))
                      );
                    } else {
                      const currentIds = receivedNotes.flatMap((n) => [
                        n.id,
                        ...(n.receivedProducts?.map((p) => p.id) || []),
                      ]);
                      setSelectedRows(
                        selectedRows.filter((id) => !currentIds.includes(id))
                      );
                    }
                  }}
                />
              </TableHead>
              <TableHead className="font-bold">Mã phiếu nhập</TableHead>
              <TableHead className="font-bold">Ngày nhập</TableHead>
              <TableHead className="text-right font-bold">
                Nhà cung cấp
              </TableHead>
              <TableHead className="text-right font-bold">
                Cần trả NCC
              </TableHead>
              <TableHead className="text-center font-bold">
                Trạng thái
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Hiển thị Skeleton khi đang tải
              <ReceivedNotesSkeleton rows={meta.pageSize} />
            ) : (
              receivedNotes.map((note) => {
                const productIds =
                  note.receivedProducts?.map((p) => p.id) || [];
                const isNoteSelected = selectedRows.includes(note.id);
                const isExpanded = expandedRows.includes(note.id);

                return (
                  <React.Fragment key={note.id}>
                    {/* --- HÀNG CHA: THÔNG TIN TÓM TẮT --- */}
                    <TableRow
                      data-state={isNoteSelected && "selected"}
                      className={isExpanded ? "border-b-0 bg-blue-50/30" : ""}
                    >
                      <TableCell>
                        <button
                          onClick={() => toggleRowExpand(note.id)}
                          className="p-1"
                        >
                          {isExpanded ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={isNoteSelected}
                          onCheckedChange={() =>
                            handleSelectRow(note.id, productIds)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        PN-{note.id}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(note.createdAt).toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {note.provider?.name || "N/A"}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {(note.debtMoney).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={getStatusStyle(note.status)}>
                          {
                            statusOptions.find((o) => o.id === note.status)
                              ?.name
                          }
                        </span>
                      </TableCell>
                      <TableCell>
                        {/* <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => console.log("Edit", note.id)}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu> */}
                      </TableCell>
                    </TableRow>

                    {/* --- HÀNG CHI TIẾT (ĐÃ CẬP NHẬT) --- */}
                    {isExpanded && (
                      <TableRow className="bg-muted/10 hover:bg-muted/20 border-b-0 border-l-2 border-chart-2">
                        <TableCell colSpan={8} className="p-6">
                          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2">
                            {/* 1. Header chi tiết: ID và Trạng thái */}
                            <div className="flex items-center gap-4 border-b border-border pb-4">
                              <h3 className="text-xl font-bold text-foreground">
                                {note.id}
                              </h3>
                              <span className={getStatusStyle(note.status)}>
                                {
                                  statusOptions.find(
                                    (o) => o.id === note.status
                                  )?.name
                                }
                              </span>
                            </div>

                            {/* 2. Thông tin chung (Grid 2 cột) */}
                            <div className="grid grid-cols-2 gap-x-20 gap-y-2 text-sm">
                              <div className="flex justify-between border-b border-border py-1">
                                <span className="text-muted-foreground">
                                  Ngày nhập:
                                </span>
                                <span className="text-foreground">
                                  {new Date(note.createdAt).toLocaleString(
                                    "vi-VN",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-border py-1">
                                <span className="text-muted-foreground">
                                  Tên NCC:
                                </span>
                                <span className="text-primary font-medium">
                                  {note.provider?.name}
                                </span>
                              </div>
                            </div>

                            {/* 3. Bảng danh sách sản phẩm nhập */}
                            <div className="mt-4 rounded-md border-border overflow-hidden">
                              <Table>
                                <TableHeader className="bg-muted/50">
                                  <TableRow>
                                    {/* Đã bỏ cột Checkbox ở đây */}
                                    <TableHead>Mã hàng</TableHead>
                                    <TableHead>Tên hàng</TableHead>
                                    <TableHead className="text-right">
                                      Số lượng
                                    </TableHead>
                                    <TableHead className="text-right">
                                      Đơn giá
                                    </TableHead>
                                    <TableHead className="text-right">
                                      Giá nhập
                                    </TableHead>
                                    <TableHead className="text-right">
                                      Thành tiền
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {note.receivedProducts?.map((item) => {
                                    const unitPrice =
                                      item.addQuantity > 0
                                        ? item.total / item.addQuantity
                                        : 0;
                                    return (
                                      <TableRow
                                        key={item.id}
                                        className="hover:bg-transparent"
                                      >
                                        {/* Đã bỏ TableCell Checkbox ở đây */}
                                        <TableCell className="text-chart-2 font-medium border-b-0">
                                          {item.productId}
                                        </TableCell>
                                        <TableCell>
                                          {item.productName}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {item.addQuantity}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {unitPrice.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {unitPrice.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                          {item.total.toLocaleString()}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}

                                  {/* --- HÀNG TỔNG CỘNG MỚI THÊM --- */}
                                  <TableRow className="bg-muted/20 font-medium border-b-0">
                                    <TableCell colSpan={4}></TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                      Tổng tiền hàng:
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-lg">
                                      {(note.total + note.discount).toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow className="hover:bg-transparent border-t-0 border-b-0">
                                    <TableCell colSpan={4}></TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                      Giảm giá:
                                    </TableCell>
                                    <TableCell className="text-right ">
                                      -{note.discount.toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow className="hover:bg-transparent border-t-0 border-b-0">
                                    <TableCell colSpan={4}></TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                      Đã trả NCC:
                                    </TableCell>
                                    <TableCell className="text-right  ">
                                      {note.payedMoney.toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow className="hover:bg-transparent border-t-0 ">
                                    <TableCell colSpan={4}></TableCell>
                                    <TableCell className="text-right font-bold">
                                      Còn nợ NCC:
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-chart-2 ">
                                      {/* Logic nợ: Giả sử ở đây bạn trả hết, nếu có field paid thì note.total - discount - note.paid */}
                                      {note.debtMoney.toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                  {/* --- 4. HÀNG NÚT THAO TÁC MỚI THÊM --- */}
                                  <TableRow className="hover:bg-transparent border-t-0">
                                    <TableCell colSpan={6}>
                                      {" "}
                                      {/* colSpan phải khớp với tổng số cột của bảng chi tiết */}
                                      <div className="flex justify-end items-center gap-3 mt-2">
                                        <BarcodeDialog note={note} />
                                        {/* Nút Nhập hàng: Chỉ hiện khi trạng thái là draft */}
                                        {note.status === "draft" && (
                                          <Button
                                            variant="default"
                                            size="sm"
                                            className="flex items-center gap-2 bg-chart-4 hover:bg-chart-4/60"
                                            onClick={() =>
                                              handleConfirm(note.id)
                                            }
                                          >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Chấp nhận
                                          </Button>
                                        )}

                                        {/* Nút Trả hàng: Chỉ hiện khi trạng thái là confirm */}

                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex items-center gap-2 text-destructive border-destructive hover:bg-destructive/10"
                                          onClick={() => handleCancel(note.id)}
                                          disabled={note.status === "cancelled"}
                                        >
                                          <Undo2 className="w-4 h-4" />
                                          Hủy
                                        </Button>

                                        {/* Nút Sửa: Disable nếu đã hủy */}
                                        <div
                                          className={
                                            note.status === "cancelled"
                                              ? "pointer-events-none opacity-50"
                                              : ""
                                          }
                                        >
                                          <EditReceivedNote
                                            receivedNote={note}
                                            onSuccess={fetchNotes}
                                          />
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* THAY THẾ PHẦN <Pagination> CŨ BẰNG ĐOẠN ĐÃ ĐƯỢC TỐI ƯU DƯỚI ĐÂY */}
        <div className="py-4 flex flex-wrap items-center justify-between gap-4 border-t border-border mt-4">
          <Pagination className="w-auto mx-0">
            <PaginationContent>
              {/* Nút Quay lại */}
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setMeta((prev) => ({
                      ...prev,
                      currentPage: Math.max(1, prev.currentPage - 1),
                    }))
                  }
                  className={
                    meta.currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer select-none"
                  }
                />
              </PaginationItem>

              {/* Render danh sách trang rút gọn bằng hàm utils chung */}
              {meta.totalPages > 0 &&
                getPaginationRange(meta.currentPage, meta.totalPages).map(
                  (page, index) => {
                    if (page === "...") {
                      return (
                        <PaginationItem key={`dots-${index}`}>
                          <span className="px-3 py-2 text-sm text-muted-foreground select-none">
                            ...
                          </span>
                        </PaginationItem>
                      );
                    }

                    return (
                      <PaginationItem key={`page-${page}`}>
                        <PaginationLink
                          isActive={meta.currentPage === page}
                          onClick={() =>
                            setMeta((prev) => ({
                              ...prev,
                              currentPage: page as number,
                            }))
                          }
                          className="cursor-pointer select-none"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }
                )}

              {/* Nút Tiếp theo */}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setMeta((prev) => ({
                      ...prev,
                      currentPage: Math.min(
                        prev.totalPages,
                        prev.currentPage + 1
                      ),
                    }))
                  }
                  className={
                    meta.currentPage === meta.totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer select-none"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          {/* Phần nhập số trang cần nhảy đến */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Đi đến trang</span>
            <Input
              type="number"
              min={1}
              max={meta.totalPages}
              defaultValue={meta.currentPage}
              key={meta.currentPage} // Đồng bộ lại giá trị input khi thay đổi trang từ bên ngoài
              className="w-16 h-9 text-center focus-visible:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const targetPage = parseInt(
                    (e.target as HTMLInputElement).value,
                    10
                  );
                  if (targetPage >= 1 && targetPage <= meta.totalPages) {
                    setMeta((prev) => ({ ...prev, currentPage: targetPage }));
                  } else {
                    (e.target as HTMLInputElement).value =
                      meta.currentPage.toString();
                  }
                }
              }}
              onBlur={(e) => {
                const targetPage = parseInt(e.target.value, 10);
                if (targetPage >= 1 && targetPage <= meta.totalPages) {
                  setMeta((prev) => ({ ...prev, currentPage: targetPage }));
                } else {
                  e.target.value = meta.currentPage.toString();
                }
              }}
            />
            <span>/ {meta.totalPages}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceivedNotesList;
