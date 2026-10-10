import { useRef, type ReactNode } from 'react';
import { ImagePlus } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/Button';

interface ImagePickButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  multiple?: boolean;
  onPick: (files: File[]) => void;
  children?: ReactNode;
}

/** 画像を選ぶボタン（スマホではカメラ撮影も選べる） */
export function ImagePickButton({ multiple, onPick, children, ...props }: ImagePickButtonProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button {...props} onClick={() => ref.current?.click()}>
        <ImagePlus />
        {children ?? '画像を選ぶ'}
      </Button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
          if (files.length > 0) onPick(files);
          e.target.value = '';
        }}
      />
    </>
  );
}
