interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
}

/** Controlled search input for list pages. Debounce the value (useDebounce) before sending it as `q`. */
function SearchBox({ value, onChange, label, placeholder = 'Search…' }: SearchBoxProps) {
  return (
    <div className="mt-2" style={{ maxWidth: 360 }}>
      <input
        type="search"
        className="form-control form-control-sm"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

export default SearchBox
