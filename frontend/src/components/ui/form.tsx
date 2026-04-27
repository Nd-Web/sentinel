import {
  type ComponentProps,
  type HTMLAttributes,
  createContext,
  forwardRef,
  useContext,
  useId,
} from 'react'
import { Slot } from '@radix-ui/react-slot'
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName }

const FormFieldContext = createContext<FormFieldContextValue>({} as FormFieldContextValue)

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(props: ControllerProps<TFieldValues, TName, TTransformedValues>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

function useFormField() {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()
  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext.name) throw new Error('useFormField must be used within <FormField>')

  const { id } = itemContext
  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = { id: string }
const FormItemContext = createContext<FormItemContextValue>({} as FormItemContextValue)

const FormItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = useId()
    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn('space-y-1.5', className)} {...props} />
      </FormItemContext.Provider>
    )
  },
)
FormItem.displayName = 'FormItem'

const FormLabel = forwardRef<HTMLLabelElement, ComponentProps<'label'>>(
  ({ className, ...props }, ref) => {
    const { error, formItemId } = useFormField()
    return (
      <Label
        ref={ref}
        htmlFor={formItemId}
        className={cn(error && 'text-red-400', className)}
        {...props}
      />
    )
  },
)
FormLabel.displayName = 'FormLabel'

const FormControl = forwardRef<HTMLElement, ComponentProps<typeof Slot>>(
  ({ ...props }, ref) => {
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField()
    return (
      <Slot
        ref={ref}
        id={formItemId}
        aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
        aria-invalid={!!error}
        {...props}
      />
    )
  },
)
FormControl.displayName = 'FormControl'

const FormDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { formDescriptionId } = useFormField()
    return (
      <p
        ref={ref}
        id={formDescriptionId}
        className={cn('text-xs text-slate-500', className)}
        {...props}
      />
    )
  },
)
FormDescription.displayName = 'FormDescription'

const FormMessage = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { error, formMessageId } = useFormField()
    const body = error ? String(error.message) : children
    if (!body) return null
    return (
      <p
        ref={ref}
        id={formMessageId}
        role="alert"
        className={cn('text-xs text-red-400', className)}
        {...props}
      >
        {body}
      </p>
    )
  },
)
FormMessage.displayName = 'FormMessage'

export {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  useFormField,
}
