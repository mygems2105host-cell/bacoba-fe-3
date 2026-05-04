import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from "@/components/ui/command";
  import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover";
  import { Check, ChevronsUpDown, Plus } from "lucide-react";
  import { useState } from "react";
  import { cn } from "@/lib/utils";
  import { Button } from "@/components/ui/button";
  
  interface Option {
    id: string;
    name: string;
  }
  
  interface SingleComboboxProps {
    options: Option[];
    value?: string; // ID của option
    onChange: (value: string) => void;
    onAdd?: (inputValue: string) => void;
    placeholder?: string;
    emptyText?: string;
  }
  
  export function SingleCombobox({
    options,
    value,
    onChange,
    onAdd,
    placeholder = "Chọn...",
    emptyText = "Không tìm thấy kết quả",
  }: SingleComboboxProps) {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
  
    const selectedOption = options.find((opt) => opt.id.toString() === value);
  
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-background font-normal"
          >
            {selectedOption ? selectedOption.name : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Tìm kiếm..." 
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty className="py-2 px-4 text-sm">
                {emptyText}
              </CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => {
                      onChange(option.id.toString());
                      setOpen(false);
                      setInputValue("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.id.toString() ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.name}
                  </CommandItem>
                ))}
              </CommandGroup>
  
              {inputValue.trim() !== "" && !options.some(o => o.name.toLowerCase() === inputValue.toLowerCase()) && (
                <CommandGroup border-t>
                  <CommandItem
                    onSelect={() => {
                      onAdd?.(inputValue);
                      setOpen(false);
                      setInputValue("");
                    }}
                    className="text-primary font-medium cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm mới: "{inputValue}"
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }