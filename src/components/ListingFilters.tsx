import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Filter, X, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface FilterState {
  rank: string;
  priceMin: number;
  priceMax: number;
  levelMin: number;
  levelMax: number;
  region: string;
  elitePass: boolean | null;
  sortBy: string;
}

const defaultFilters: FilterState = {
  rank: "all",
  priceMin: 0,
  priceMax: 10000,
  levelMin: 1,
  levelMax: 100,
  region: "all",
  elitePass: null,
  sortBy: "newest",
};

const RANKS = ["Bronze", "Silver", "Gold", "Diamond", "Heroic"];
const REGIONS = ["India", "Brazil", "Indonesia", "Thailand", "Vietnam", "Middle East", "Europe", "North America"];

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  activeCount: number;
}

export { defaultFilters };

export default function ListingFilters({ filters, onChange, activeCount }: Props) {
  const [open, setOpen] = useState(false);

  const update = (partial: Partial<FilterState>) => onChange({ ...filters, ...partial });
  const reset = () => onChange(defaultFilters);

  const filtersActive =
    filters.rank !== "all" ||
    filters.priceMin > 0 ||
    filters.priceMax < 10000 ||
    filters.levelMin > 1 ||
    filters.levelMax < 100 ||
    filters.region !== "all" ||
    filters.elitePass !== null;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Sort */}
      <div className="space-y-2">
        <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Sort By</Label>
        <Select value={filters.sortBy} onValueChange={(v) => update({ sortBy: v })}>
          <SelectTrigger className="bg-secondary/50 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="price_asc">Price: Low → High</SelectItem>
            <SelectItem value="price_desc">Price: High → Low</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="level_desc">Highest Level</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rank */}
      <div className="space-y-2">
        <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Rank</Label>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={filters.rank === "all" ? "default" : "outline"}
            className="cursor-pointer font-display text-xs"
            onClick={() => update({ rank: "all" })}
          >
            All
          </Badge>
          {RANKS.map((r) => (
            <Badge
              key={r}
              variant={filters.rank === r ? "default" : "outline"}
              className="cursor-pointer font-display text-xs"
              onClick={() => update({ rank: r })}
            >
              {r}
            </Badge>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">
          Price Range: ${filters.priceMin} – ${filters.priceMax}
        </Label>
        <div className="flex gap-3">
          <Input
            type="number"
            min={0}
            value={filters.priceMin}
            onChange={(e) => update({ priceMin: Number(e.target.value) })}
            className="bg-secondary/50 border-border/50 h-9 text-sm"
            placeholder="Min"
          />
          <Input
            type="number"
            min={0}
            value={filters.priceMax}
            onChange={(e) => update({ priceMax: Number(e.target.value) })}
            className="bg-secondary/50 border-border/50 h-9 text-sm"
            placeholder="Max"
          />
        </div>
      </div>

      {/* Level Range */}
      <div className="space-y-3">
        <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">
          Account Level: {filters.levelMin} – {filters.levelMax}
        </Label>
        <Slider
          min={1}
          max={100}
          step={1}
          value={[filters.levelMin, filters.levelMax]}
          onValueChange={([min, max]) => update({ levelMin: min, levelMax: max })}
          className="py-2"
        />
      </div>

      {/* Region */}
      <div className="space-y-2">
        <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Region</Label>
        <Select value={filters.region} onValueChange={(v) => update({ region: v })}>
          <SelectTrigger className="bg-secondary/50 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {REGIONS.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Elite Pass */}
      <div className="flex items-center justify-between">
        <Label className="font-display text-xs uppercase tracking-wider text-muted-foreground">Elite Pass Only</Label>
        <Switch
          checked={filters.elitePass === true}
          onCheckedChange={(v) => update({ elitePass: v ? true : null })}
        />
      </div>

      {/* Reset */}
      {filtersActive && (
        <Button variant="ghost" onClick={reset} className="w-full gap-2 text-muted-foreground">
          <RotateCcw className="h-4 w-4" /> Reset Filters
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar filters */}
      <div className="hidden lg:block w-64 shrink-0">
        <div className="glass glass-border rounded-2xl p-5 sticky top-20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" /> Filters
            </h3>
            {filtersActive && (
              <Badge variant="secondary" className="text-[10px]">{activeCount} results</Badge>
            )}
          </div>
          <FilterContent />
        </div>
      </div>

      {/* Mobile filter sheet */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 font-display">
              <Filter className="h-4 w-4" /> Filters
              {filtersActive && (
                <Badge variant="default" className="ml-1 text-[10px] h-5 w-5 p-0 flex items-center justify-center rounded-full">
                  !
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle className="font-display">Filters</SheetTitle>
              <SheetDescription>Narrow down your search</SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
