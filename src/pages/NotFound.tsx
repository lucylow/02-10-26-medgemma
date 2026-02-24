import { Link } from "react-router-dom";
import { Home, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4">
      <div className="text-center space-y-6 max-w-sm">
        <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
        <p className="text-muted-foreground">
          The page you’re looking for doesn’t exist or was moved.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="default">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pediscreen">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              PediScreen
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
