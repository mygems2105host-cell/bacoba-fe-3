import React, { useState, useEffect, useMemo } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  // CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarIcon, 
  FileDown, 
  TrendingUp, 
  DollarSign, 
  ReceiptText, 
  RotateCcw,
  Search,
  AlertCircle
} from "lucide-react";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { getBills } from "@/services/api"; 
import type { Bill } from "@/types";

const BillStatistic: React.FC = () => {
  // Mặc định: Từ 00:00:00 đến 23:59:59 ngày hôm nay
  const defaultRange: DateRange = {
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  };

  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(defaultRange);
  const [appliedRange, setAppliedRange] = useState<DateRange | undefined>(defaultRange);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await getBills({ pageSize: 1000 });
      if (response.success) {
        setBills(response.data);
      }
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Xử lý Cập nhật: Ép kiểu thời gian về đầu ngày và cuối ngày
  const handleApplyFilter = () => {
    if (!tempDateRange?.from) return;

    const finalRange: DateRange = {
      from: startOfDay(tempDateRange.from),
      // Nếu không có ngày kết thúc (chỉ chọn 1 ngày), lấy endOfDay của ngày bắt đầu
      to: endOfDay(tempDateRange.to || tempDateRange.from),
    };
    
    setAppliedRange(finalRange);
  };

  const handleReset = () => {
    setTempDateRange(defaultRange);
    setAppliedRange(defaultRange);
  };

  const filteredData = useMemo(() => {
    if (!appliedRange?.from || !appliedRange?.to) return bills;

    return bills.filter((bill) => {
      const billDate = new Date(bill.createdAt);
      // So sánh chính xác: billDate có nằm trong khoảng [00:00:00, 23:59:59] không
      return isWithinInterval(billDate, { 
        start: appliedRange.from!, 
        end: appliedRange.to! 
      });
    });
  }, [bills, appliedRange]);

  const stats = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, item) => sum + (item.total + (item.discount || 0)), 0);
    const totalVAT = filteredData.reduce((sum, item) => sum + (item.total * 0.1), 0); 
    const actualCollection = filteredData.reduce((sum, item) => sum + item.total, 0);
    return { totalRevenue, totalVAT, actualCollection, count: filteredData.length };
  }, [filteredData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 bg-background min-h-screen text-foreground">
      {/* TOOLBAR */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[280px] justify-start font-medium border-input">
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {tempDateRange?.from ? (
                  tempDateRange.to ? (
                    <>{format(tempDateRange.from, "dd/MM/yyyy")} - {format(tempDateRange.to, "dd/MM/yyyy")}</>
                  ) : (
                    format(tempDateRange.from, "dd/MM/yyyy")
                  )
                ) : (
                  <span>Chọn ngày thống kê</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-border shadow-xl" align="start">
              <Calendar
                mode="range"
                selected={tempDateRange}
                onSelect={setTempDateRange}
                numberOfMonths={2}
                locale={vi}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button onClick={handleApplyFilter} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
            <Search className="mr-2 h-4 w-4" /> Lọc dữ liệu
          </Button>

          <Button variant="ghost" size="icon" onClick={handleReset} className="text-muted-foreground hover:text-foreground" title="Đặt lại hôm nay">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" className="border-primary/20 hover:bg-primary/5 text-primary">
          <FileDown className="mr-2 h-4 w-4" /> Xuất báo cáo (Excel)
        </Button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Số lượng Bill", val: `${stats.count} đơn`, icon: ReceiptText, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "Doanh thu gộp", val: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
          { label: "Thuế VAT (10%)", val: formatCurrency(stats.totalVAT), icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "Thực thu", val: formatCurrency(stats.actualCollection), icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map((item, i) => (
          <Card key={i} className="border-none shadow-sm ring-1 ring-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wide">{item.label}</CardTitle>
              <div className={cn("p-2 rounded-lg", item.bg)}>
                <item.icon className={cn("h-4 w-4", item.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{item.val}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TABLE */}
      <Card className="border-border shadow-sm overflow-hidden">
        <div className="bg-muted/30 px-6 py-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-lg">Danh sách giao dịch</h2>
          <Badge variant="secondary" className="font-mono">{filteredData.length} kết quả</Badge>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="pl-6 font-bold py-4">Mã Bill</TableHead>
                <TableHead className="font-bold">Thời gian</TableHead>
                <TableHead className="text-right font-bold">Doanh thu</TableHead>
                <TableHead className="text-right font-bold">VAT</TableHead>
                <TableHead className="text-right pr-6 font-bold">Thực nhận</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground animate-pulse">Đang tải dữ liệu...</TableCell></TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">Không có dữ liệu trong khoảng thời gian này.</TableCell></TableRow>
              ) : (
                filteredData.map((bill) => (
                  <TableRow key={bill.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="pl-6 font-mono font-medium text-primary">#{bill.id}</TableCell>
                    <TableCell>{format(new Date(bill.createdAt), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(bill.total + (bill.discount || 0))}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(bill.total * 0.1)}</TableCell>
                    <TableCell className="text-right font-bold pr-6">{formatCurrency(bill.total)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {filteredData.length > 0 && (
              <TableFooter className="bg-muted/50 border-t-2">
                <TableRow>
                  <TableCell colSpan={2} className="pl-6 font-bold py-6">TỔNG CỘNG</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(stats.totalRevenue)}</TableCell>
                  <TableCell className="text-right font-bold text-muted-foreground">{formatCurrency(stats.totalVAT)}</TableCell>
                  <TableCell className="text-right font-black text-primary text-xl pr-6">{formatCurrency(stats.actualCollection)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillStatistic;