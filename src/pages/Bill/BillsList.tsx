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
  ChevronDown,
  ChevronRight,
  Undo2,
  // FileText,
  ArrowRightLeft,
  // RotateCcw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import React, { useEffect, useState } from "react";
import TagCombobox from "@/components/ui/TagCombobox";
import { getBills, returnBill } from "@/services/api";
import type { Bill } from "@/types";
import { ExchangeBill } from "@/components/bill/ExchangeBill";
import { EditBill } from "@/components/bill/EditBill";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";


const TableSkeleton = () => {
  return (
    <>
      {[...Array(10)].map((_, i) => (
        <TableRow key={i}>
          {/* 1. Nút mở rộng */}
          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
          
          {/* 2. Checkbox */}
          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
          
          {/* 3. Mã hóa đơn */}
          <TableCell>
            <div className="flex flex-col gap-1">
               <Skeleton className="h-5 w-20" />
               {/* Giả lập dòng "Đổi từ..." nếu cần */}
            </div>
          </TableCell>
          
          {/* 4. Thời gian */}
          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
          
          {/* 5. Khách hàng */}
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </TableCell>
          
          {/* 6. Tổng tiền (Cần căn phải cho khớp TableHead) */}
          <TableCell className="text-right">
            <Skeleton className="h-5 w-20 ml-auto" />
          </TableCell>
          
          {/* 7. Trạng thái (Căn giữa) */}
          <TableCell>
            <Skeleton className="h-6 w-24 mx-auto rounded-full" />
          </TableCell>
          
          {/* 8. Thao tác (Căn phải) */}
          <TableCell className="text-right pr-6">
            <Skeleton className="h-8 w-8 ml-auto rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

function BillsList() {
  interface Option {
    id: string;
    name: string;
  }

  const statusOptions: Option[] = [
    { id: "completed", name: "Hoàn thành" },
    { id: "cancelled", name: "Hủy" },
    { id: "returned", name: "Trả hàng" },
  ];

  const [selectedStatus, setSelectedStatus] = useState<Option[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  // 1. Thêm state để lưu thông tin phân trang từ API
  const [totalPages, setTotalPages] = useState(1);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        pageSize: 10,
        // API Postman yêu cầu UPPERCASE (VD: COMPLETED)
        status:
          selectedStatus.length > 0
            ? selectedStatus.map((s) => s.id.toUpperCase()).join(",")
            : undefined,
        search: searchQuery.trim() || undefined,
      };

      const response = await getBills(params);

      if (response.success) {
        setBills(response.data);
        // Cập nhật tổng số trang từ meta của API
        setTotalPages(response.meta.totalPages);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách hóa đơn");
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 100);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchBills();
    }, 500); // Debounce search 500ms

    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, selectedStatus, searchQuery]);

  // Logic lọc hóa đơn
  // const bills = bills.filter((bill: any) => {
  //   const matchesStatus =
  //     selectedStatus.length === 0 ||
  //     selectedStatus.some((s) => s.id === bill.status);
  //   const matchesSearch =
  //     bill.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
  //     (bill.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ??
  //       false);

  //   return matchesStatus && matchesSearch;
  // });

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  const handleSelectRow = (billId: string, productIds: string[]) => {
    const allIds = [billId, ...productIds];
    const isSelected = selectedRows.includes(billId);

    if (isSelected) {
      setSelectedRows((prev) => prev.filter((item) => !allIds.includes(item)));
    } else {
      setSelectedRows((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const getStatusStyle = (status: string) => {
    // Chuyển về lowercase để so sánh cho an toàn nếu API trả về mixed case
    const s = status?.toLowerCase();
    switch (s) {
      case "active":
      case "completed":
        return "text-success bg-success/10 px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wider";
      case "cancelled":
        return "text-destructive bg-destructive/10 px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wider";
      case "returned":
        return "text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wider";
      default:
        return "text-muted-foreground bg-muted px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wider";
    }
  };

  const handleReturnBill = async (id: string) => {
    try {
      setLoading(true);
      await returnBill(id);
      toast.success("Đã hoàn trả hóa đơn thành công");
      fetchBills(); // Load lại danh sách sau khi trả hàng thành công
    } catch (error) {
      toast.error("Có lỗi xảy ra khi hoàn trả hóa đơn");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full p-5 flex flex-wrap gap-y-6 bg-background">
      {/* HEADER SECTION */}
      <div className="basis-1/4">
        <p className="text-2xl font-bold tracking-tight text-foreground">
          Hóa đơn
        </p>
      </div>
      <div className="basis-3/4 flex justify-between">
        <div className="basis-1/2">
          <Input
            type="search"
            placeholder="Tìm theo mã hóa đơn hoặc khách hàng"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset về trang 1 khi tìm kiếm mới
            }}
            className="focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* FILTER SIDEBAR */}
      <div className="basis-1/4 w-full px-5">
        <div className="basis-full w-full">
          <p className="text-sm font-bold py-3 text-foreground">Trạng thái</p>
          <TagCombobox
            options={statusOptions}
            selected={selectedStatus}
            onChange={(val) => {
              setSelectedStatus(val);
              setCurrentPage(1);
            }}
            placeholder="Chọn trạng thái..."
          />
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="basis-3/4 min-h-[calc(100vh-200px)] flex flex-col justify-between">
        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      bills.length > 0 &&
                      bills.every((b: any) => selectedRows.includes(b.id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const allIds = bills.flatMap((b: any) => [
                          b.id,
                          ...(b.billProducts?.map((p: any) => p.id) || []),
                        ]);
                        setSelectedRows(
                          Array.from(new Set([...selectedRows, ...allIds]))
                        );
                      } else {
                        const currentIds = bills.flatMap((b: any) => [
                          b.id,
                          ...(b.billProducts?.map((p: any) => p.id) || []),
                        ]);
                        setSelectedRows(
                          selectedRows.filter((id) => !currentIds.includes(id))
                        );
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="font-bold text-foreground">
                  Mã hóa đơn
                </TableHead>
                <TableHead className="font-bold text-foreground">
                  Thời gian
                </TableHead>
                <TableHead className="font-bold text-foreground">
                  Khách hàng
                </TableHead>
                <TableHead className="text-right font-bold text-foreground">
                  Tổng tiền
                </TableHead>
                <TableHead className="text-center font-bold text-foreground">
                  Trạng thái
                </TableHead>
                <TableHead className="text-right font-bold text-foreground pr-6">
                  Thao tác
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton />
              ) :(bills.map((bill: any) => {
                const productIds =
                  bill.billProducts?.map((p: any) => p.id) || [];
                const isBillSelected = selectedRows.includes(bill.id);
                const isExpanded = expandedRows.includes(bill.id);

                return (
                  <React.Fragment key={bill.id}>
                    <TableRow
                      data-state={isBillSelected && "selected"}
                      className={
                        isExpanded
                          ? "border-b-0 bg-muted/30"
                          : "hover:bg-muted/30"
                      }
                    >
                      <TableCell>
                        <button
                          onClick={() => toggleRowExpand(bill.id)}
                          className="p-1 hover:text-primary transition-colors"
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
                          checked={isBillSelected}
                          onCheckedChange={() =>
                            handleSelectRow(bill.id, productIds)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {bill.id}
                          </span>
                          {bill.exchange && (
                            <span className="text-[10px] text-primary flex items-center gap-1 italic">
                              <ArrowRightLeft size={10} />
                              Đổi từ {bill.exchange.id}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(bill.createdAt).toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {bill.customerName || "Khách lẻ"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {bill.phoneNumber}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${
                          bill.status === "returned"
                            ? "text-muted-foreground line-through"
                            : "text-primary"
                        }`}
                      >
                        {bill.total.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={getStatusStyle(bill.status)}>
                          {statusOptions.find((o) => o.id === bill.status)
                            ?.name || bill.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* <div className="flex justify-end gap-2 pr-2">
                          {(bill.status === "active" || bill.status === "completed") && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:bg-primary/10"
                                title="Đổi hàng"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                title="Trả hàng"
                              >
                                <Undo2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div> */}
                      </TableCell>
                    </TableRow>

                    {/* DETAILS EXPANDED */}
                    {isExpanded && (
                      <TableRow className="bg-primary/5 hover:bg-primary/5 border-b-0 border-l-4 border-primary">
                        <TableCell colSpan={8} className="p-6">
                          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between border-b border-border pb-4">
                              <h3 className="text-xl font-bold text-foreground">
                                Chi tiết hóa đơn{" "}
                                <span className="text-primary">{bill.id}</span>
                                {bill.status === "returned" && (
                                  <span className="ml-3 text-sm font-normal text-destructive italic">
                                    (Đã thực hiện trả hàng/đổi hàng)
                                  </span>
                                )}
                              </h3>
                            </div>

                            <div className="grid grid-cols-2 gap-x-20 gap-y-2 text-sm">
                              <div className="flex justify-between border-b border-border/50 py-1">
                                <span className="text-muted-foreground">
                                  Tên hóa đơn:
                                </span>
                                <span className="text-foreground">
                                  {bill.name || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-border/50 py-1">
                                <span className="text-muted-foreground">
                                  Khách hàng:
                                </span>
                                <span className="text-primary font-medium">
                                  {bill.customerName}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 rounded-md overflow-hidden border border-border bg-background">
                              <Table>
                                <TableHeader className="bg-muted/50">
                                  <TableRow>
                                    <TableHead className="text-foreground">
                                      Mã hàng
                                    </TableHead>
                                    <TableHead className="text-foreground">
                                      Tên hàng
                                    </TableHead>
                                    <TableHead className="text-right text-foreground">
                                      Số lượng
                                    </TableHead>
                                    <TableHead className="text-right text-foreground">
                                      Đơn giá
                                    </TableHead>
                                    <TableHead className="text-right text-foreground">
                                      Thành tiền
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {bill.billProducts?.map((item: any) => (
                                    <TableRow
                                      key={item.id}
                                      className="hover:bg-muted/30 border-border"
                                    >
                                      <TableCell className="text-primary font-medium">
                                        {item.productId}
                                      </TableCell>
                                      <TableCell className="text-foreground">
                                        {item.productName}
                                      </TableCell>
                                      <TableCell className="text-right text-foreground">
                                        {item.quantity}
                                      </TableCell>
                                      <TableCell className="text-right text-foreground">
                                        {item.salePrice.toLocaleString()}
                                      </TableCell>
                                      <TableCell className="text-right font-medium text-foreground">
                                        {item.total.toLocaleString()}
                                      </TableCell>
                                    </TableRow>
                                  ))}

                                  {/* BILL SUMMARY */}
                                  <TableRow className="bg-muted/20 font-medium border-t-2 border-border">
                                    <TableCell colSpan={3}></TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                      Tổng tiền hàng:
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-foreground">
                                      {(
                                        bill.total + (bill.discount || 0)
                                      ).toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow className="hover:bg-transparent border-none">
                                    <TableCell colSpan={3}></TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                      Giảm giá:
                                    </TableCell>
                                    <TableCell className="text-right text-destructive font-medium">
                                      -{bill.discount.toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                  <TableRow className="hover:bg-transparent border-none">
                                    <TableCell colSpan={3}></TableCell>
                                    <TableCell className="text-right font-bold text-lg text-foreground">
                                      {bill.status === "returned"
                                        ? "Tiền đã trả:"
                                        : "Khách phải trả:"}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-lg text-primary">
                                      {bill.total.toLocaleString()}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>

                            {/* ACTION BUTTONS */}
                            {(bill.status === "active" ||
                              bill.status === "completed") && (
                              <div className="flex justify-end items-center gap-3 mt-2">
                                {/* <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-2 hover:bg-muted font-medium border-secondary text-seconborder-secondary"
                                >
                                  <FileText className="w-4 h-4" />
                                  Chỉnh sửa thông tin
                                </Button> */}
                                <EditBill bill={bill} onSuccess={fetchBills} />

                                <ExchangeBill
                                  originalBill={bill}
                                  onSuccess={fetchBills}
                                />

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex items-center gap-2 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-all font-medium"
                                    >
                                      <Undo2 className="w-4 h-4" />
                                      Trả toàn bộ hàng
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Xác nhận trả hàng?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Bạn có chắc chắn muốn hoàn trả toàn bộ
                                        hàng cho hóa đơn{" "}
                                        <span className="font-bold text-foreground">
                                          {bill.id}
                                        </span>
                                        ? Thao tác này sẽ cập nhật trạng thái
                                        hóa đơn và không thể hoàn tác.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          handleReturnBill(bill.id)
                                        }
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Xác nhận trả hàng
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              }))}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        <div className="py-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) setCurrentPage(currentPage - 1);
                  }}
                />
              </PaginationItem>

              {/* Render số trang động */}
              {[...Array(totalPages)].map((_, index) => (
                <PaginationItem key={index}>
                  <PaginationLink
                    href="#"
                    isActive={currentPage === index + 1}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(index + 1);
                    }}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages)
                      setCurrentPage(currentPage + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}

export default BillsList;
