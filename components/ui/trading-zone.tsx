"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from "lucide-react";

interface TradingZoneProps {
  type: "buy" | "sell";
  price: number;
  currentPrice: number;
  score: number;
  reason: string;
  strength?: "weak" | "moderate" | "strong";
  volume?: number;
  distance?: number;
  variant?: "default" | "compact" | "detailed";
  onAction?: () => void;
  className?: string;
}

export function TradingZone({
  type,
  price,
  currentPrice,
  score,
  reason,
  strength,
  volume,
  distance,
  variant = "default",
  onAction,
  className,
}: TradingZoneProps) {
  const isBuy = type === "buy";
  const isSell = type === "sell";

  const percentage = ((price - currentPrice) / currentPrice) * 100;
  const absPercentage = Math.abs(percentage);

  const getZoneConfig = () => {
    if (isBuy) {
      return {
        color: "green",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/30",
        textColor: "text-green-400",
        icon: TrendingUp,
        label: "Buy Zone",
        actionLabel: "Go Long",
        actionIcon: ArrowUpRight,
      };
    }
    return {
      color: "red",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      textColor: "text-red-400",
      icon: TrendingDown,
      label: "Sell Zone",
      actionLabel: "Go Short",
      actionIcon: ArrowDownRight,
    };
  };

  const getStrengthConfig = () => {
    if (!strength) return null;
    const configs = {
      weak: { color: "bg-gray-500", label: "Weak" },
      moderate: { color: "bg-yellow-500", label: "Moderate" },
      strong: { color: isBuy ? "bg-green-500" : "bg-red-500", label: "Strong" },
    };
    return configs[strength];
  };

  const getScoreColor = () => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreBadgeVariant = () => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    if (score >= 40) return "outline";
    return "destructive";
  };

  const config = getZoneConfig();
  const Icon = config.icon;
  const ActionIcon = config.actionIcon;
  const strengthConfig = getStrengthConfig();

  if (variant === "compact") {
    return (
      <Card
        className={cn(
          "glass-card border-0 hover:border-blur-orange/30 transition-all duration-300 cursor-pointer",
          className
        )}
      >
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4", config.textColor)} />
              <div>
                <p className={cn("text-sm font-bold", config.textColor)}>
                  ${price.toLocaleString()}
                </p>
                <p className="text-xs text-blur-text-muted">
                  {percentage >= 0 ? "+" : ""}
                  {percentage.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getScoreBadgeVariant()} className="text-xs">
                {score}
              </Badge>
              {strengthConfig && (
                <div
                  className={cn("w-2 h-2 rounded-full", strengthConfig.color)}
                ></div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "detailed") {
    return (
      <Card
        className={cn(
          "glass-card border-0 hover:border-blur-orange/30 transition-all duration-300",
          className
        )}
      >
        <CardContent className="p-4 space-y-4">
          {/* Price Information */}
          <div className="flex items-center justify-between">
            <div>
              <p
                className={cn("text-2xl font-bold font-mono", config.textColor)}
              >
                ${price.toLocaleString()}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-blur-text-muted">
                  {isBuy ? "Below" : "Above"} current: $
                  {currentPrice.toLocaleString()}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded",
                    isBuy
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  )}
                >
                  {percentage >= 0 ? "+" : ""}
                  {percentage.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Distance Indicator */}
            {distance !== undefined && (
              <div className="text-right">
                <p className="text-xs text-blur-text-muted">Distance</p>
                <p className="text-lg font-mono font-bold text-blur-text-primary">
                  {distance.toFixed(2)}%
                </p>
              </div>
            )}
          </div>

          {/* Zone Strength */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blur-text-muted">
                Zone Strength
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-blur-bg-tertiary rounded-full h-2 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      getScoreColor().replace("text-", "bg-")
                    )}
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
                <span className={cn("text-sm font-medium", getScoreColor())}>
                  {score}%
                </span>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {volume && (
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-sm text-blur-text-muted">
                Volume Support
              </span>
              <span className="text-sm font-medium text-blur-text-secondary">
                {volume.toLocaleString()}
              </span>
            </div>
          )}

          {/* Reason */}
          <div className="p-3 bg-blur-bg-tertiary rounded-lg border border-white/10">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blur-orange mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blur-text-secondary leading-relaxed">
                {reason}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={onAction}
            className={cn(
              "w-full flex items-center gap-2",
              isBuy
                ? "bg-green-500 hover:bg-green-600"
                : "bg-red-500 hover:bg-red-600"
            )}
          >
            <ActionIcon className="w-4 h-4" />
            {config.actionLabel}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card
      className={cn(
        "glass-card border-0 hover:border-blur-orange/30 transition-all duration-300 cursor-pointer",
        "hover:shadow-blur-card hover:translate-y-[-2px]",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={cn("w-5 h-5", config.textColor)} />
              <span
                className={cn(
                  "font-bold uppercase tracking-wide",
                  config.textColor
                )}
              >
                {config.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getScoreBadgeVariant()} className="text-xs">
                {score}
              </Badge>
              {strengthConfig && (
                <div
                  className={cn("w-2 h-2 rounded-full", strengthConfig.color)}
                ></div>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="text-center">
            <p className="text-2xl font-bold font-mono text-blur-text-primary">
              ${price.toLocaleString()}
            </p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-xs text-blur-text-muted">
                {isBuy ? "Below" : "Above"} current
              </span>
              <span
                className={cn(
                  "text-xs font-medium px-2 py-1 rounded",
                  isBuy
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                )}
              >
                {percentage >= 0 ? "+" : ""}
                {percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-blur-bg-tertiary rounded-full h-2 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  getScoreColor().replace("text-", "bg-")
                )}
                style={{ width: `${score}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-blur-text-muted">Strength</span>
              <span className={cn("text-xs font-medium", getScoreColor())}>
                {score}%
              </span>
            </div>
          </div>

          {/* Reason */}
          {reason && (
            <div className="text-xs text-blur-text-muted text-center">
              💡 {reason}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
