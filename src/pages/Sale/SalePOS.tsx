import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  ShoppingCart,
  User,
  CreditCard,
  X,
  FileText,
  Search,
  Minus,
  ScanBarcode,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { type Bill, type Product } from "@/types";
import { createBill, getProducts, type CreateBillParams } from "@/services/api";

const MAX_BILLS = 30;
const STORAGE_KEY = "temp_sales_pos_bills";

export default function SalePOS() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [, setIsLoadingProducts] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeBillId, setActiveBillId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showPriceWarning, setShowPriceWarning] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const formatNumber = (num: number) => num.toLocaleString("en-US");
  const parseFormattedNumber = (value: string) =>
    Number(value.replace(/,/g, "")) || 0;

  const generateNewBill = (): Bill => ({
    id: `HD${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`,
    customerName: "",
    phoneNumber: "",
    name: "",
    discount: 0,
    total: 0,
    status: "completed",
    createdAt: new Date(),
    updatedAt: new Date(),
    billProducts: [],
  });

  // --- LOGIC TỒN KHO ẢO ---
  // Tính toán số lượng sản phẩm đang nằm trong các hóa đơn chờ khác
  const committedQuantities = useMemo(() => {
    const counts: Record<string, number> = {};
    
    bills.forEach((bill) => {
      // Chỉ tính toán trên các đơn hàng KHÔNG phải đơn hiện tại
      if (bill.id === activeBillId) return;
  
      // Sử dụng optional chaining và fallback về mảng rỗng để tránh lỗi undefined
      (bill.billProducts || []).forEach((p: any) => {
        if (p.id) {
          counts[p.id] = (counts[p.id] || 0) + (p.quantity || 0);
        }
      });
    });
    
    return counts;
  }, [bills, activeBillId]);

  // --- LOGIC DỮ LIỆU ---
  useEffect(() => {
    const fetchInitialProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const response = await getProducts({ pageSize: 100000 });
        if (response.success) {
          const variantsOnly = response.data.flatMap((parent) =>
            parent.variants && Array.isArray(parent.variants) ? parent.variants : []
          );
          setAllProducts(variantsOnly);
        }
      } catch (error) {
        toast.error("Không thể tải danh sách sản phẩm");
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchInitialProducts();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formatted = parsed.map((b: any) => ({
            ...b,
            createdAt: new Date(b.createdAt),
            updatedAt: new Date(b.updatedAt),
            billProducts: b.billProducts || [],
          }));
          setBills(formatted);
          setActiveBillId(formatted[0].id);
        } else { handleInitFirstBill(); }
      } catch (e) { handleInitFirstBill(); }
    } else { handleInitFirstBill(); }
  }, []);

  const handleInitFirstBill = () => {
    const newBill = generateNewBill();
    setBills([newBill]);
    setActiveBillId(newBill.id);
  };

  useEffect(() => {
    if (bills.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
    }
  }, [bills]);

  const activeBill = useMemo(
    () => bills.find((b) => b.id === activeBillId),
    [bills, activeBillId]
  );

  useEffect(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) {
      setSearchResults([]);
      return;
    }
    const results = allProducts.filter((p) => {
      return p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term) || p.barcode?.toLowerCase().includes(term);
    });
    setSearchResults(results);
  }, [searchTerm, allProducts]);

  // --- ACTIONS ---
  const updateActiveBill = (fields: Partial<Bill>) => {
    setBills((prev) =>
      prev.map((b) => (b.id === activeBillId ? { ...b, ...fields, updatedAt: new Date() } : b))
    );
  };

  const addProductToBill = (product: Product) => {
    if (!activeBillId) return;
    
    const otherQty = committedQuantities[product.id] || 0;
    const available = product.quantity - otherQty;

    if (available <= 0) {
      toast.error("Sản phẩm đã hết hàng (đang nằm trong các đơn chờ khác)");
      return;
    }

    setBills((prev) =>
      prev.map((bill) => {
        if (bill.id !== activeBillId) return bill;
        const products = bill.billProducts || [];
        const existingIdx = products.findIndex((p: any) => p.id === product.id);
        let newProducts: any[];
        
        if (existingIdx > -1) {
          newProducts = [...products];
          const currentQty = newProducts[existingIdx].quantity || 0;
          newProducts[existingIdx] = {
            ...newProducts[existingIdx],
            quantity: Math.min(available, currentQty + 1),
          };
        } else {
          newProducts = [...products, { ...product, quantity: 1, originalSalePrice: product.salePrice, stock: product.quantity }];
        }
        
        return {
          ...bill,
          billProducts: newProducts,
          total: newProducts.reduce((sum, p) => sum + p.salePrice * p.quantity, 0),
        };
      })
    );
    setSearchTerm("");
    setIsSearchFocused(false);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setBills((prev) =>
      prev.map((bill) => {
        if (bill.id !== activeBillId) return bill;
        const newProducts = (bill.billProducts || []).map((p: any) => {
          if (p.id === productId) {
            const otherQty = committedQuantities[p.id] || 0;
            const available = p.stock - otherQty;
            
            let newQty = (p.quantity || 1) + delta;
            
            if (newQty > available) {
              toast.warning(`Chỉ còn ${available} sản phẩm khả dụng cho đơn này`);
              newQty = available;
            }
            
            return { ...p, quantity: Math.max(1, newQty) };
          }
          return p;
        });
        return {
          ...bill,
          billProducts: newProducts,
          total: newProducts.reduce((sum, item) => sum + item.salePrice * item.quantity, 0),
        };
      })
    );
  };

  const updateProductPrice = (productId: string, newPrice: number) => {
    setBills((prev) =>
      prev.map((bill) => {
        if (bill.id !== activeBillId) return bill;
        const newProducts = (bill.billProducts || []).map((p: any) =>
          p.id === productId ? { ...p, salePrice: newPrice } : p
        );
        return {
          ...bill,
          billProducts: newProducts,
          total: newProducts.reduce((sum, item) => sum + item.salePrice * item.quantity, 0),
        };
      })
    );
  };

  const removeProductFromBill = (productId: string) => {
    setBills((prev) =>
      prev.map((bill) => {
        if (bill.id !== activeBillId) return bill;
        const newProducts = (bill.billProducts || []).filter((p: any) => p.id !== productId);
        return {
          ...bill,
          billProducts: newProducts,
          total: newProducts.reduce((sum, p) => sum + p.salePrice * p.quantity, 0),
        };
      })
    );
  };

  const removeBill = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = bills.filter((b) => b.id !== id);
    if (filtered.length === 0) {
      handleInitFirstBill();
    } else {
      setBills(filtered);
      if (activeBillId === id) setActiveBillId(filtered[0].id);
    }
  };

  const validateAndCheckout = () => {
    if (!activeBill?.billProducts?.length) return;

    // Validate tồn kho ảo lần cuối trước khi thanh toán
    const overStockItem = activeBill.billProducts.find((p: any) => {
        const otherQty = committedQuantities[p.id] || 0;
        return p.quantity > (p.stock - otherQty);
    });

    if (overStockItem) {
        toast.error(`Sản phẩm ${overStockItem.name} vượt quá số lượng khả dụng. Vui lòng kiểm tra lại.`);
        return;
    }
    
    // Kiểm tra xem có sản phẩm nào giá thấp hơn giá niêm yết không
    const hasLowPrice = activeBill.billProducts.some(
      (p: any) => p.salePrice < (p.originalSalePrice || 0)
    );

    if (hasLowPrice) {
      setShowPriceWarning(true);
    } else {
      handleCheckout();
    }
  };

  const handleCheckout = async () => {
    setIsSubmitting(true);
    setShowPriceWarning(false);
    try {
      const payload: CreateBillParams = {
        name: activeBill?.name || `Hóa đơn ${activeBill?.id}`,
        customerName: activeBill?.customerName || "Khách lẻ",
        phoneNumber: activeBill?.phoneNumber || "",
        discount: activeBill?.discount || 0,
        total: (activeBill?.total || 0) - (activeBill?.discount || 0),
        status: "completed",
        billProducts: activeBill?.billProducts?.map((p: any) => ({
          productId: p.id,
          quantity: p.quantity,
          salePrice: p.salePrice,
          total: p.salePrice * p.quantity,
        })) || [],
      };

      const response = await createBill(payload);
      if (response.success) {
        toast.success(`Thanh toán thành công ${activeBill?.id}`);
        const remaining = bills.filter((b) => b.id !== activeBillId);
        if (remaining.length === 0) handleInitFirstBill();
        else {
          setBills(remaining);
          setActiveBillId(remaining[0].id);
        }
      } else {
        toast.error(response.message || "Lỗi tạo hóa đơn");
      }
    } catch (error) {
      toast.error("Lỗi kết nối");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- BARCODE ---
  const handleBarcodeScan = (code: string) => {
    const cleanCode = code.trim().toLowerCase();
    const product = allProducts.find(p => p.barcode?.toLowerCase() === cleanCode || p.id.toLowerCase() === cleanCode);
    if (product) {
      addProductToBill(product);
    } else {
      setSearchTerm(code);
      searchInputRef.current?.focus();
    }
  };

  useEffect(() => {
    let buffer = "";
    let lastTime = Date.now();
    const handleKey = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastTime > 50) buffer = "";
      lastTime = now;
      if (e.key === "Enter") {
        if (buffer.length > 2) { handleBarcodeScan(buffer); buffer = ""; }
      } else if (e.key.length === 1) buffer += e.key;
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [allProducts, activeBillId, committedQuantities]);

  return (
    <div className="flex h-[calc(100vh-100px)] w-full bg-background text-foreground border-t border-border overflow-hidden">
      {/* SIDEBAR LEFT */}
      <aside className="w-16 lg:w-64 border-r border-border flex flex-col bg-card shrink-0">
        <div className="p-3 border-b border-border flex items-center justify-between h-14 shrink-0">
          <h2 className="font-bold text-xs hidden lg:block uppercase tracking-widest text-muted-foreground">Hóa đơn chờ</h2>
          <Button size="icon" variant="ghost" onClick={() => bills.length < MAX_BILLS ? setBills([...bills, generateNewBill()]) : toast.error("Tối đa 30 đơn")}>
            <Plus size={18} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {bills.map((bill) => (
            <div
              key={bill.id}
              onClick={() => setActiveBillId(bill.id)}
              className={`p-3 mb-1 rounded-sm border cursor-pointer group flex flex-col ${activeBillId === bill.id ? "bg-primary/5 border-primary/40" : "border-transparent hover:bg-muted"}`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[10px] font-mono ${activeBillId === bill.id ? "text-primary font-bold" : ""}`}>{bill.id}</span>
                <X size={14} className="opacity-0 group-hover:opacity-100 hover:text-destructive" onClick={(e) => removeBill(bill.id, e)} />
              </div>
              <p className="font-semibold text-sm truncate hidden lg:block">{bill.customerName || "Khách lẻ"}</p>
              <p className="font-bold text-xs mt-1">{bill.total.toLocaleString()}đ</p>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        <header className="h-14 border-b border-border bg-card flex items-center px-4 shrink-0">
          <div className="flex-1 max-w-2xl flex items-center gap-2 bg-background border border-border rounded-md px-3 focus-within:ring-2 focus-within:ring-primary/20">
            <Search className="text-muted-foreground" size={16} />
            <Input
              ref={searchInputRef}
              placeholder="F2: Tìm sản phẩm..."
              className="border-none shadow-none focus-visible:ring-0 h-10 px-0"
              value={searchTerm}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="icon" className="ml-4 h-10 w-10 hover:text-primary"><ScanBarcode size={18} /></Button>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {isSearchFocused && searchResults.length > 0 && (
            <div className="absolute top-0 left-4 right-4 bg-card border border-border shadow-2xl z-[100] max-h-80 overflow-y-auto rounded-b-md">
              {searchResults.map((p) => {
                const otherQty = committedQuantities[p.id] || 0;
                const available = p.quantity - otherQty;
                const isOutOfStock = available <= 0;

                return (
                  <div
                    key={p.id}
                    className={`p-3 border-b flex justify-between items-center ${isOutOfStock ? "opacity-50 cursor-not-allowed bg-muted" : "hover:bg-primary/5 cursor-pointer"}`}
                    onClick={() => !isOutOfStock && addProductToBill(p)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{p.name} {isOutOfStock && <span className="text-destructive ml-2 text-[10px]">(Không khả dụng- do nằm trên đơn khác)</span>}</span>
                      <span className="text-[10px] text-muted-foreground">Khả dụng: {available} / Tổng: {p.quantity} | {p.id}</span>
                    </div>
                    <span className="text-sm font-black text-primary">{p.salePrice.toLocaleString()}đ</span>
                  </div>
                );
              })}
            </div>
          )}

          <section className="flex-1 p-4 bg-muted/10 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col border border-border rounded-md bg-card overflow-hidden">
              <div className="flex-1 overflow-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead className="text-xs font-black">SẢN PHẨM</TableHead>
                      <TableHead className="w-32 text-center text-xs font-black">SỐ LƯỢNG</TableHead>
                      <TableHead className="w-40 text-right text-xs font-black">ĐƠN GIÁ</TableHead>
                      <TableHead className="w-40 text-right text-xs font-black">THÀNH TIỀN</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeBill?.billProducts?.map((item: any, idx: any) => {
                      const isLowPrice = item.salePrice < (item.originalSalePrice || 0);
                      const otherQty = committedQuantities[item.id] || 0;
                      const available = item.stock - otherQty;
                      const isAtMax = item.quantity >= available;

                      return (
                        <TableRow key={item.id} className="group">
                          <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <span className="font-bold text-sm block">{item.name}</span>
                            <span className={`text-[10px] ${isAtMax ? "text-orange-500 font-bold" : "text-muted-foreground"}`}>
                                Khả dụng: {available} (Tổng kho: {item.stock})
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}><Minus size={12} /></Button>
                              <div className="relative">
                                <Input 
                                  className={`h-8 w-14 text-center p-0 font-bold ${isAtMax ? "border-orange-500 text-orange-600" : ""}`}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    updateQuantity(item.id, val - item.quantity);
                                  }}
                                />
                              </div>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7" 
                                disabled={isAtMax}
                                onClick={() => updateQuantity(item.id, 1)}
                              >
                                <Plus size={12} />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1">
                                <Input 
                                  className={`h-8 w-28 text-right font-bold ${isLowPrice ? "border-orange-400" : ""}`}
                                  value={formatNumber(item.salePrice)}
                                  onChange={(e) => updateProductPrice(item.id, parseFormattedNumber(e.target.value))}
                                />
                              </div>
                              {isLowPrice && (
                                <span className="text-[10px] text-orange-500 font-medium flex items-center gap-1 mt-1">
                                  <AlertCircle size={10} /> Thấp hơn giá kho ({formatNumber(item.originalSalePrice)})
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-black">{(item.salePrice * item.quantity).toLocaleString()}đ</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeProductFromBill(item.id)}><Trash2 size={14} /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {!activeBill?.billProducts?.length && (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/30">
                    <ShoppingCart size={48} className="mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">Giỏ hàng trống</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* SIDEBAR RIGHT */}
      <aside className="w-80 border-l border-border bg-card flex flex-col shrink-0">
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2"><User size={16} className="text-primary" /><span className="text-[10px] font-black uppercase text-muted-foreground">Khách hàng</span></div>
            <Input placeholder="Tên khách hàng" value={activeBill?.customerName ?? ""} onChange={(e) => updateActiveBill({ customerName: e.target.value })} />
            <Input placeholder="Số điện thoại" value={activeBill?.phoneNumber ?? ""} onChange={(e) => updateActiveBill({ phoneNumber: e.target.value })} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2"><FileText size={16} className="text-primary" /><span className="text-[10px] font-black uppercase text-muted-foreground">Thanh toán</span></div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tổng tiền</span><span className="font-bold">{activeBill?.total.toLocaleString()}đ</span></div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Giảm giá</span>
                <div className="flex items-center border-b w-24">
                  <Input className="h-8 border-none bg-transparent text-right p-0 focus-visible:ring-0" value={formatNumber(activeBill?.discount ?? 0)} onChange={(e) => updateActiveBill({ discount: parseFormattedNumber(e.target.value) })} />
                </div>
              </div>
              <div className="pt-3 border-t border-dashed flex justify-between items-end">
                <span className="text-xs font-bold uppercase text-muted-foreground">Tổng cộng</span>
                <span className="text-2xl font-black text-primary">{((activeBill?.total || 0) - (activeBill?.discount || 0)).toLocaleString()}đ</span>
              </div>
            </div>
          </div>
          <textarea className="w-full h-24 bg-background border rounded-md p-3 text-sm outline-none" placeholder="Ghi chú..." value={activeBill?.name ?? ""} onChange={(e) => updateActiveBill({ name: e.target.value })} />
        </div>

        <div className="p-5 border-t bg-card">
          <Button className="w-full h-16 text-base font-black flex gap-3" disabled={!activeBill?.billProducts?.length || isSubmitting} onClick={validateAndCheckout}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <><CreditCard size={18} /> THANH TOÁN</>}
          </Button>
        </div>
      </aside>

      {/* ALERT DIALOG CẢNH BÁO GIÁ THẤP */}
      <AlertDialog open={showPriceWarning} onOpenChange={setShowPriceWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="text-orange-500" /> Xác nhận bán dưới giá kho?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Trong đơn hàng có một số sản phẩm đang được thiết lập <strong>giá bán thấp hơn giá niêm yết</strong> trong kho. Bạn có chắc chắn muốn tiếp tục thanh toán không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kiểm tra lại</AlertDialogCancel>
            <AlertDialogAction className="bg-primary" onClick={handleCheckout}>Tiếp tục thanh toán</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}