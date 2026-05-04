import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useAppContext } from "@/context/AppContext";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  // navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Link, useNavigate } from "react-router-dom";

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link to={href}>
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

function AppHeader() {
  const products: { title: string; href: string; description: string }[] = [
    {
      title: "Quản lý hàng hóa",
      href: "/products",
      description: "Theo dõi tồn kho, thông tin chi tiết và phân loại sản phẩm.",
    },
    {
      title: "Nhập hàng",
      href: "/received-notes",
      description: "Quản lý phiếu nhập kho và kiểm soát số lượng hàng về.",
    }
  ];
  const providers: { title: string; href: string; description: string }[] = [
    {
      title: "Các nhà cung cấp",
      href: "/providers",
      description: "Lưu trữ thông tin liên lạc và lịch sử giao dịch với đối tác.",
    }
  ];
  const sales: { title: string; href: string; description: string }[] = [
    {
      title: "Bán hàng",
      href: "/sale",
      description: "Giao diện thanh toán nhanh, tạo đơn hàng và xử lý giao dịch.",
    },
    {
      title: "Danh sách hóa đơn",
      href: "/bills",
      description: "Tra cứu, quản lý và in lại các hóa đơn đã thanh toán.",
    },
    {
      title: "Thống kê doanh thu",
      href: "/bills-statistic",
      description: "Tra cứu, quản lý doanh thu",
    }
  ];
  
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAppContext();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="md:px-12 sticky top-0 z-50 w-full border-b border-border/40 bg-background/30 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 justify-between items-center px-4">
        <div className="basis-1/2 h-full">
          <img
            src={"logo"}
            alt="logo"
            className="h-full w-auto cursor-pointer"
            onClick={() => navigate("/")}
          />
        </div>

        <div className="basis-1/2 flex justify-end items-center gap-4">
          <div className="hidden md:block">
            {isAuthenticated && user && (
              <span className="text-sm text-muted-foreground">
                Xin chào, <strong>{user.username}</strong>
              </span>
            )}
          </div>
          <NavigationMenu viewport={false}>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent mr-1">
                  Hàng hóa
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[300px] gap-2  grid-cols-1 ">
                    {products.map((product) => (
                      <ListItem
                        key={product.title}
                        title={product.title}
                        href={product.href}
                      >
                        {product.description}
                      </ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent mr-1">
                  Nhà cung cấp
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[300px] gap-2  grid-cols-1 ">
                    {providers.map((product) => (
                      <ListItem
                        key={product.title}
                        title={product.title}
                        href={product.href}
                      >
                        {product.description}
                      </ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent mr-1">
                  Bán hàng
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[300px] gap-2  grid-cols-1 ">
                    {sales.map((product) => (
                      <ListItem
                        key={product.title}
                        title={product.title}
                        href={product.href}
                      >
                        {product.description}
                      </ListItem>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
          <ModeToggle />
          <div className="flex gap-2">
            {isAuthenticated ? (
              <Button variant="ghost" onClick={handleLogout}>
                Đăng xuất
              </Button>
            ) : (
              <>
                <Button
                  className="bg-background text-primary border border-border hover:bg-primary hover:text-white"
                  variant="outline"
                >
                  <Link to="/login">Đăng nhập</Link>
                </Button>
                <Button variant="ghost">
                  <Link to="/register">Đăng ký</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
