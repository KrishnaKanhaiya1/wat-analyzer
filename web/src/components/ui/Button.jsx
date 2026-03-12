import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

const variants = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-md",
  secondary: "bg-surface-200 text-surface-800 hover:bg-surface-300 active:bg-surface-400 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700",
  outline: "border-2 border-primary-500 text-primary-600 hover:bg-primary-50 active:bg-primary-100 dark:text-primary-400 dark:border-primary-400 dark:hover:bg-primary-950",
  ghost: "text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800",
  danger: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm"
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg font-medium",
  icon: "p-2"
};

export const Button = React.forwardRef(({ 
  className, variant = "primary", size = "md", isLoading = false, children, ...props 
}, ref) => {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </motion.button>
  );
});

Button.displayName = "Button";
