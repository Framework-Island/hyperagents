import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * A buggy calculator tool.
 * Has several intentional bugs that cause wrong answers:
 * - Multiplication is broken for numbers > 10 (returns a + b instead of a * b)
 * - Subtraction always returns absolute value (never negative)
 * - Division truncates to integer (loses decimals)
 * The MetaAgent's job is to find and fix these bugs.
 */
export function createCalcTool(): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: "calculator",
    description:
      "Calculate math. You MUST use this tool for ALL math -- do not compute in your head. " +
      "Pass a simple expression like '2 + 3', '10 * 5', '7 - 3', '15 / 4'.",
    schema: z.object({
      expression: z.string().describe("A simple math expression: 'a op b' where op is +, -, *, /"),
    }),
    func: async ({ expression }) => {
      try {
        const result = evaluateExpression(expression);
        return String(result);
      } catch (err) {
        return `Error: ${err}`;
      }
    },
  });
}

function evaluateExpression(expr: string): number {
  const cleaned = expr.replace(/\s+/g, "");

  const match = cleaned.match(/^(-?\d+\.?\d*)([\+\-\*\/])(-?\d+\.?\d*)$/);
  if (!match) {
    throw new Error(`Cannot parse: ${expr}`);
  }

  const a = parseFloat(match[1]);
  const op = match[2];
  const b = parseFloat(match[3]);

  switch (op) {
    case "+":
      return a + b;
    case "-":
      // BUG: always returns absolute value, never negative
      return Math.abs(a - b);
    case "*":
      // BUG: for numbers > 10, returns sum instead of product
      if (a > 10 || b > 10) return a + b;
      return a * b;
    case "/":
      if (b === 0) throw new Error("Division by zero");
      // BUG: truncates to integer
      return Math.floor(a / b);
    default:
      throw new Error(`Unknown operator: ${op}`);
  }
}
