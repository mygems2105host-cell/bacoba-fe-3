import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import {
  ChevronDown,
  ChevronRight,
  History,
  MoreHorizontal,
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
// Import mock data và types
import { type Provider } from "@/types/Provider";
import { type HistoryProvider } from "@/types/HistoryProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TagCombobox from "@/components/ui/TagCombobox";
import AddNewProvider from "@/components/provider/AddNewProvider";
import AddNewHistory from "@/components/provider/AddNewHistory";
import EditProviderDialog from "@/components/provider/EditProviderDialog";
import EditHistoryProvider from "@/components/provider/EditHistoryProvider";
import { getHistoryProviders, getProviders } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { getPaginationRange } from "@/lib/pagination";

const ProvidersSkeleton = () => {
  return (
    <>
      {/* Skeleton cho hàng Tổng cộng */}
      <TableRow className="bg-muted/50">
        <TableCell colSpan={6} className="text-right py-4">
          <Skeleton className="h-4 w-20 ml-auto" />
        </TableCell>
        <TableCell className="text-right">
          <Skeleton className="h-4 w-24 ml-auto" />
        </TableCell>
        <TableCell className="text-right">
          <Skeleton className="h-4 w-24 ml-auto" />
        </TableCell>
        <TableCell colSpan={2} />
      </TableRow>

      {/* Skeleton cho 10 hàng dữ liệu */}
      {Array.from({ length: 10 }).map((_, i) => (
        <TableRow key={i} className="border-border">
          <TableCell>
            <Skeleton className="h-4 w-4" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-4" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-4 w-24 ml-auto" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-4 w-24 ml-auto" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-4 w-24 ml-auto" />
          </TableCell>
          <TableCell className="text-center">
            <Skeleton className="h-6 w-20 mx-auto rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-8 w-8 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

function ProvidersList() {
  interface Option {
    id: string;
    name: string;
  }

  const statusOptions: Option[] = [
    { id: "active", name: "Đang hoạt động" },
    { id: "inactive", name: "Ngừng hoạt động" },
  ];

  const [providers, setProviders] = useState<Provider[]>([]);
  const [histories, setHistories] = useState<HistoryProvider[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<Option[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ totalPages: 1, currentPage: 1 });
  const [searchTerm, setSearchTerm] = useState("");
  const fetchData = async () => {
    setLoading(true);
    try {
      const statusQuery = selectedStatus.map((s) => s.id).join(",");

      const [provRes, histRes] = await Promise.all([
        getProviders({
          search: searchQuery,
          status: statusQuery,
          page: meta.currentPage, // Sử dụng page hiện tại từ state meta
          pageSize: 10,
        } as any),
        getHistoryProviders(),
      ]);

      if (provRes.success) {
        setProviders(provRes.data);
        // CẬP NHẬT: Chỉ cập nhật totalPages, không nên set lại currentPage từ API
        // nếu API trả về không khớp với request để tránh loop.
        setMeta((prev) => ({
          ...prev,
          totalPages: provRes.meta.totalPages,
        }));
      }
      if (histRes.success) setHistories(histRes.data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 100);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchQuery, meta.currentPage, selectedStatus]);

  useEffect(() => {
    // Tạo một timer để trì hoãn việc gọi API
    const delayDebounceFn = setTimeout(() => {
      // Chỉ khi người dùng ngừng gõ 500ms thì mới cập nhật searchQuery chính
      // searchQuery thay đổi sẽ kích hoạt logic fetchData trong useEffect phía dưới (nếu bạn tách riêng)
      // Hoặc gọi trực tiếp fetchData ở đây:
      setSearchQuery(searchTerm);
    }, 500); // 500ms là khoảng thời gian hợp lý

    // Cleanup function: Xóa timer cũ nếu người dùng tiếp tục gõ trước khi hết 500ms
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Logic lọc Nhà cung cấp tại Client dựa trên trạng thái
  // const filteredProviders = useMemo(() => {
  //   return providers.filter((prov) => {
  //     const matchesStatus =
  //       selectedStatus.length === 0 ||
  //       selectedStatus.some((s) => s.id === prov.status);
  //     return matchesStatus;
  //   });
  // }, [providers, selectedStatus]);

  // --- TÍNH TOÁN TỔNG CỘNG CHO TABLE CHA ---
  const displayProviders = providers;
  const grandTotalBuy = displayProviders.reduce((sum, p) => sum + p.total, 0);
  const grandTotalDebt = displayProviders.reduce(
    (sum, p) => sum + p.debtTotal,
    0
  );
  // const grandTotalPaid = grandTotalBuy - grandTotalDebt;

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  const handleSelectRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return "text-chart-4 bg-chart-4/10 px-2 py-1 rounded-full text-xs font-semibold";
      case "inactive":
        return "text-muted-foreground bg-muted px-2 py-1 rounded-full text-xs font-semibold";
      default:
        return "text-primary bg-primary/10 px-2 py-1 rounded-full text-xs font-semibold";
    }
  };

  if (loading && providers.length === 0) {
    return (
      <div className="p-10 text-center animate-pulse">Đang tải dữ liệu...</div>
    );
  }

  return (
    <div className="w-full h-full p-5 flex flex-wrap gap-y-6">
      <div className="basis-1/4">
        <div className="basis-full flex flex-wrap">
          <p className="text-2xl font-bold">Nhà cung cấp</p>
        </div>
      </div>
      <div className="basis-3/4 flex flex-wrap justify-between">
        <div className="basis-1/2">
          <Input
            type="search"
            placeholder="Tìm theo mã hoặc tên NCC..."
            className="border-input"
            value={searchTerm} // Dùng searchTerm để input mượt mà
            onChange={(e) => {
              setSearchTerm(e.target.value); // Cập nhật state gõ phím ngay lập tức
              setMeta((prev) => ({ ...prev, currentPage: 1 })); // Reset về trang 1
            }}
          />
        </div>
        <div className="basis-1/3 flex justify-around items-center">
          <AddNewProvider onSuccess={fetchData} />
        </div>
      </div>

      <div className="basis-1/4 w-full px-5">
        <div className="basis-full w-full flex flex-wrap">
          <div className="basis-full w-full">
            <p className="basis-full text-sm font-bold py-3">Trạng thái</p>
            <TagCombobox
              options={statusOptions}
              selected={selectedStatus}
              onChange={(val) => {
                setSelectedStatus(val);
                setMeta((prev) => ({ ...prev, currentPage: 1 })); // Thêm dòng này
              }}
              placeholder="Chọn trạng thái..."
            />
          </div>
        </div>
      </div>

      <div className="basis-3/4 min-h-[calc(100vh-200px)] flex flex-col justify-between">
        <div className="overflow-auto">
          <Table className="border-collapse">
            <TableHeader className="bg-muted">
              <TableRow className="border-border">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[50px]">
                  <Checkbox
                    className="border-input data-[state=checked]:bg-primary"
                    checked={
                      providers.length > 0 &&
                      providers.every((p) => selectedRows.includes(p.id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRows(providers.map((p) => p.id));
                      } else {
                        setSelectedRows([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="font-bold text-foreground">
                  Mã NCC
                </TableHead>
                <TableHead className="font-bold text-foreground">
                  Tên nhà cung cấp
                </TableHead>
                <TableHead className="text-left font-bold text-foreground">
                  Email
                </TableHead>
                <TableHead className="text-right font-bold text-foreground">
                  Điện thoại
                </TableHead>

                <TableHead className="text-right font-bold text-foreground">
                  Tổng mua
                </TableHead>
                {/* <TableHead className="text-right font-bold text-foreground">
                  Đã trả
                </TableHead> */}
                <TableHead className="text-right font-bold text-foreground">
                  Nợ hiện tại
                </TableHead>
                <TableHead className="text-center font-bold text-foreground">
                  Trạng thái
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <ProvidersSkeleton />
              ) : providers.length > 0 ? (
                <>
                  {/* HÀNG TỔNG CỘNG */}
                  <TableRow className="bg-muted/50 hover:bg-muted/50 border-t-2 border-border font-bold">
                    <TableCell
                      colSpan={6}
                      className="text-right text-foreground py-4"
                    >
                      Tổng cộng:
                    </TableCell>

                    <TableCell className="text-right text-foreground">
                      {grandTotalBuy.toLocaleString()}
                    </TableCell>
                    {/* <TableCell className="text-right text-chart-4">
                      {grandTotalPaid.toLocaleString()}
                    </TableCell> */}
                    <TableCell className="text-right text-destructive">
                      {grandTotalDebt.toLocaleString()}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>

                  {providers.map((prov) => {
                    const isExpanded = expandedRows.includes(prov.id);
                    const isSelected = selectedRows.includes(prov.id);

                    // Lọc lịch sử theo Provider ID
                    const providerHistories = histories.filter(
                      (hist) => hist.provider?.id === prov.id
                    );

                    const totalPaidInHistory = providerHistories.reduce(
                      (sum, item) =>
                        item.status === "completed"
                          ? sum + item.paidAmount
                          : sum,
                      0
                    );

                    return (
                      <React.Fragment key={prov.id}>
                        <TableRow
                          data-state={isSelected && "selected"}
                          className={`${
                            isExpanded
                              ? "border-b-0 bg-accent/30"
                              : "border-border"
                          } hover:bg-accent/50 transition-colors`}
                        >
                          <TableCell>
                            <button
                              onClick={() => toggleRowExpand(prov.id)}
                              className="p-1 text-muted-foreground hover:text-foreground"
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
                              className="border-input data-[state=checked]:bg-primary"
                              checked={isSelected}
                              onCheckedChange={() => handleSelectRow(prov.id)}
                            />
                          </TableCell>
                          <TableCell className="text-sm">{prov.id}</TableCell>
                          <TableCell className="text-sm font-bold text-primary">
                            {prov.name}
                          </TableCell>
                          <TableCell className="text-left text-sm">
                            {prov.email || "---"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {prov.phoneNumber || "---"}
                          </TableCell>

                          <TableCell className="text-right">
                            {prov.total.toLocaleString()}
                          </TableCell>
                          {/* <TableCell className="text-right text-chart-4">
                            {(prov.total - prov.debtTotal).toLocaleString()}
                          </TableCell> */}
                          <TableCell className="text-right text-destructive">
                            {prov.debtTotal.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={getStatusStyle(prov.status)}>
                              {statusOptions.find((o) => o.id === prov.status)
                                ?.name || prov.status}
                            </span>
                          </TableCell>
                          <TableCell>{/* Action menu if needed */}</TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow className="bg-muted/10 hover:bg-transparent border-b-0 border-l-2 border-chart-2">
                            <TableCell colSpan={10} className="p-6">
                              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-4 border-b border-border pb-4">
                                  <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                                    <History className="w-5 h-5 text-chart-2" />
                                    Lịch sử thanh toán: {prov.name}
                                  </h3>
                                </div>

                                <div className="mt-2 rounded-md border border-border overflow-hidden bg-card">
                                  <Table>
                                    <TableHeader className="bg-muted/50">
                                      <TableRow className="border-border">
                                        <TableHead className="text-foreground">
                                          Mã phiếu
                                        </TableHead>
                                        <TableHead className="text-foreground">
                                          Ngày thanh toán
                                        </TableHead>
                                        <TableHead className="text-foreground">
                                          Nội dung
                                        </TableHead>
                                        <TableHead className="text-center text-foreground">
                                          Trạng thái
                                        </TableHead>
                                        <TableHead className="text-right text-foreground">
                                          Đã thanh toán
                                        </TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {providerHistories.length > 0 ? (
                                        <>
                                          {providerHistories.map((hist) => {
                                            const isCancelled =
                                              hist.status === "cancelled";
                                            return (
                                              <TableRow
                                                key={hist.id}
                                                className={`border-border hover:bg-accent/20 ${
                                                  isCancelled
                                                    ? "opacity-60 bg-muted/20 line-through"
                                                    : "" // Làm mờ nhẹ hàng bị hủy
                                                }`}
                                              >
                                                <TableCell className="font-medium text-chart-2">
                                                  HS-{hist.id}
                                                </TableCell>
                                                <TableCell className="text-foreground">
                                                  {new Date(
                                                    hist.createdAt
                                                  ).toLocaleString("vi-VN")}
                                                </TableCell>
                                                <TableCell className="italic text-muted-foreground text-sm">
                                                  {hist.description ||
                                                    "Không có ghi chú"}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                  <span
                                                    className={
                                                      hist.status ===
                                                      "completed"
                                                        ? "text-chart-4 bg-chart-4/10 px-2 py-0.5 rounded text-xs"
                                                        : "text-background bg-destructive/80 px-2 py-0.5 rounded text-xs"
                                                    }
                                                  >
                                                    {hist.status === "completed"
                                                      ? "Thành công"
                                                      : "Đã hủy"}
                                                  </span>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-primary">
                                                  {hist.paidAmount.toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                  <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                      asChild
                                                    >
                                                      <Button
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        disabled={
                                                          hist.status ===
                                                          "cancelled"
                                                        }
                                                      >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                      <DropdownMenuItem
                                                        onSelect={(e) =>
                                                          e.preventDefault()
                                                        }
                                                      >
                                                        <EditHistoryProvider
                                                          providerId={prov.id}
                                                          history={hist}
                                                          providerName={
                                                            prov.name
                                                          }
                                                          currentDebtOfProvider={
                                                            prov.debtTotal
                                                          }
                                                          onRefresh={fetchData}
                                                        />
                                                      </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                          <TableRow className="bg-muted/30 border-t-2 border-border font-bold">
                                            <TableCell
                                              colSpan={4}
                                              className="text-right text-foreground"
                                            >
                                              Tổng cộng đã thanh toán:
                                            </TableCell>
                                            <TableCell className="text-right text-chart-4 text-lg">
                                              {totalPaidInHistory.toLocaleString()}
                                            </TableCell>
                                            <TableCell />
                                          </TableRow>
                                        </>
                                      ) : (
                                        <TableRow>
                                          <TableCell
                                            colSpan={6}
                                            className="text-center py-8 text-muted-foreground"
                                          >
                                            Không có lịch sử thanh toán cho nhà
                                            cung cấp này.
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>

                                <div className="flex justify-end items-center gap-3">
                                  <AddNewHistory
                                    providerId={prov.id}
                                    providerName={prov.name}
                                    currentDebt={prov.debtTotal}
                                    onSuccess={fetchData}
                                  />
                                  <EditProviderDialog
                                    provider={prov}
                                    onSuccess={fetchData}
                                  />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center py-10 text-muted-foreground"
                  >
                    Không tìm thấy nhà cung cấp nào.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* PHÂN TRANG */}
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

export default ProvidersList;
