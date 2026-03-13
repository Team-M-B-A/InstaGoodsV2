import { Link, useLocation as useRouterLocation } from "react-router-dom";
import { Heart, Star, ShoppingBag, Eye, Check, MapPin, Truck } from "lucide-react";
import { useState, useEffect } from "react";
import { Product, suppliers } from "@/lib/data";
import { MarketplaceProduct } from "@/hooks/useMarketplaceProducts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useLocation } from "@/context/LocationContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ProductCardProps {
  product: Product | MarketplaceProduct;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const routerLocation = useRouterLocation();
  
  // Check if it's a marketplace product (from database) or static product
  const isMarketplaceProduct = 'supplier_id' in product;
  
  const productImage = isMarketplaceProduct 
    ? (product as MarketplaceProduct).image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&auto=format&fit=crop"
    : (product as Product).image;

  const productRating = isMarketplaceProduct ? 4.5 : (product as Product).rating;
  const productReviews = isMarketplaceProduct ? 0 : (product as Product).reviews;
  
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);

  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { address: userAddress } = useLocation();

  // Fetch business name for marketplace products
  useEffect(() => {
    const fetchBusinessName = async () => {
      if (isMarketplaceProduct) {
        const marketplaceProduct = product as MarketplaceProduct;
        const { data, error } = await supabase
          .from("suppliers")
          .select("business_name")
          .eq("id", marketplaceProduct.supplier_id)
          .single();
        
        if (data?.business_name) {
          setBusinessName(data.business_name);
        }
      }
    };
    
    fetchBusinessName();
  }, [isMarketplaceProduct, product]);

  // Get supplier for static products
  const staticSupplier = !isMarketplaceProduct 
    ? suppliers.find(s => s.id === (product as Product).supplierId) 
    : null;

  // Location-based availability logic (only for static products)
  let canAddToCart = true;
  if (!isMarketplaceProduct) {
    const p = product as Product;
    if (p.no_delivery) {
      canAddToCart = false;
    } else {
      const isAvailableEverywhere = p.availableEverywhere;
      const isInRegion = userAddress && p.region && userAddress.toLowerCase().includes(p.region.toLowerCase());
      canAddToCart = isAvailableEverywhere || isInRegion;
    }
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!canAddToCart) return;
    
    setIsAddingToCart(true);
    
    // Brief delay for UX feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Convert MarketplaceProduct to Product format if needed
    if (isMarketplaceProduct) {
      const marketplaceProduct = product as MarketplaceProduct;
      const productForCart: Product = {
        id: marketplaceProduct.id,
        name: marketplaceProduct.name,
        price: marketplaceProduct.price,
        image: marketplaceProduct.image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&auto=format&fit=crop",
        mainCategory: marketplaceProduct.main_category,
        subCategory: marketplaceProduct.sub_category || "",
        rating: 4.5,
        reviews: 0,
        supplierId: marketplaceProduct.supplier_id,
        description: marketplaceProduct.description || "",
        delivery_fee: marketplaceProduct.delivery_fee ?? 0,
        no_delivery: marketplaceProduct.no_delivery ?? false,
        availableEverywhere: marketplaceProduct.available_everywhere ?? true,
        collection_available: marketplaceProduct.collection_available ?? false
      };
      addToCart(productForCart);
      toast.success(`${marketplaceProduct.name} added to cart!`);
    } else {
      addToCart(product as Product);
      toast.success(`${product.name} added to cart!`);
    }
    
    setIsAddingToCart(false);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Convert MarketplaceProduct to Product format if needed for wishlist
    let itemForWishlist: Product;
    if (isMarketplaceProduct) {
      const marketplaceProduct = product as MarketplaceProduct;
      itemForWishlist = {
        id: marketplaceProduct.id,
        name: marketplaceProduct.name,
        price: marketplaceProduct.price,
        image: marketplaceProduct.image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&auto=format&fit=crop",
        mainCategory: marketplaceProduct.main_category,
        subCategory: marketplaceProduct.sub_category || "",
        rating: 4.5,
        reviews: 0,
        supplierId: marketplaceProduct.supplier_id,
        description: marketplaceProduct.description || "",
        delivery_fee: marketplaceProduct.delivery_fee ?? 0,
        no_delivery: marketplaceProduct.no_delivery ?? false,
        availableEverywhere: marketplaceProduct.available_everywhere ?? true,
        collection_available: marketplaceProduct.collection_available ?? false
      };
    } else {
      itemForWishlist = product as Product;
    }
    
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
      toast.info("Removed from wishlist");
    } else {
      addToWishlist(itemForWishlist);
      toast.success("Added to wishlist");
    }
  };

  // Prepare state to pass when navigating
  const getLinkState = () => {
    const savedState = sessionStorage.getItem('indexPageState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        return {
          selectedMainCategory: state.mainCategory,
          selectedSubCategory: state.subCategory,
          scrollPosition: window.scrollY
        };
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <Link to={`/product/${product.id}`} state={getLinkState()} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {/* Skeleton loader for image */}
          {!isImageLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          <img
            src={productImage}
            alt={product.name}
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              isImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsImageLoaded(true)}
            loading="lazy"
          />
          
          {/* Quick action buttons - appear on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Quick View
            </Button>
          </div>
          
          {/* Wishlist button */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute right-2 top-2 bg-background/80 backdrop-blur hover:bg-background transition-colors ${
              isInWishlist(product.id) ? 'text-red-500' : 'text-muted-foreground'
            }`}
            onClick={handleToggleWishlist}
            aria-label={isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
          </Button>
          
          {/* Not available badge */}
          {!canAddToCart && (
            <div className="absolute left-2 top-2">
              <span className="inline-block px-2 py-1 rounded bg-orange-100 text-orange-800 text-xs font-medium">
                Not Available
              </span>
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-base line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {businessName || staticSupplier?.name || (isMarketplaceProduct ? "Artisan Seller" : "Local Artisan")}
          </p>
          
          {/* Rating */}
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-accent text-accent" />
            <span className="text-sm font-medium">{productRating}</span>
            <span className="text-sm text-muted-foreground">
              ({productReviews})
            </span>
          </div>
          
          {/* Availability info */}
          <div className="flex flex-col gap-1">
            {isMarketplaceProduct ? (
              <>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  {(product as MarketplaceProduct).available_everywhere ? "Available everywhere" : <><MapPin className="h-3 w-3" /> Region: {(product as MarketplaceProduct).delivery_location || 'N/A'}</>}
                </span>
                {!(product as MarketplaceProduct).available_everywhere && (product as MarketplaceProduct).delivery_radius_km && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" /> Delivery: {(product as MarketplaceProduct).delivery_radius_km} km
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  {(product as Product).availableEverywhere ? "Available everywhere" : <><MapPin className="h-3 w-3" /> Region: {(product as Product).region || 'N/A'}</>}
                </span>
                {!(product as Product).availableEverywhere && (product as Product).deliveryRadiusKm && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" /> Delivery: {(product as Product).deliveryRadiusKm} km
                  </span>
                )}
              </>
            )}
          </div>
          
          {/* Price and Add to Cart */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-lg font-bold text-primary">R{product.price}</p>
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={!canAddToCart || isAddingToCart}
              className="gap-2 transition-all"
              title={!canAddToCart ? 'Not available in your location' : ''}
            >
              {isAddingToCart ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ShoppingBag className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isAddingToCart ? "Adding..." : "Add"}
              </span>
            </Button>
          </div>
        </div>
      </Link>
    </Card>
  );
};

export default ProductCard;
