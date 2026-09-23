import React from 'react'

import { render, fireEvent } from '@testing-library/react'

import { InputField } from './index'
import '@testing-library/jest-dom'

jest.mock('lockwright-lib-ui-react-native-components', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        colorSurfaceDestructiveElevated: '#900',
        colorTextPrimary: '#fff'
      }
    }
  })
}))

describe('InputField Component', () => {
  it('renders correctly with default props', () => {
    const { container } = render(<InputField />)
    expect(container).toMatchSnapshot()
  })

  it('renders with a label and placeholder', () => {
    const { getByPlaceholderText, getByText } = render(
      <InputField label="Test Label" placeholder="Enter text" />
    )
    expect(getByText('Test Label')).toBeInTheDocument()
    expect(getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('calls onChange when input value changes', () => {
    const handleChange = jest.fn()
    const { getByPlaceholderText } = render(
      <InputField placeholder="Enter text" onChange={handleChange} />
    )
    const input = getByPlaceholderText('Enter text')
    fireEvent.change(input, { target: { value: 'New Value' } })
    expect(handleChange).toHaveBeenCalledWith('New Value')
  })

  it('displays an error message', () => {
    const { getByText } = render(<InputField error="Error message" />)
    expect(getByText('Error message')).toBeInTheDocument()
  })

  it('renders with an icon', () => {
    const MockIcon = () => <svg data-testid="mock-icon" />
    const { getByTestId } = render(<InputField icon={MockIcon} />)
    expect(getByTestId('mock-icon')).toBeInTheDocument()
  })

  it('renders additional items', () => {
    const { getByText } = render(
      <InputField additionalItems={<div>Additional Item</div>} />
    )
    expect(getByText('Additional Item')).toBeInTheDocument()
  })

  it('renders with overlay when not focused', () => {
    const { getByText } = render(
      <InputField overlay="Overlay Text" placeholder="Enter text" />
    )
    expect(getByText('Overlay Text')).toBeInTheDocument()
  })

  it('does not call onChange when readonly', () => {
    const handleChange = jest.fn()
    const { getByPlaceholderText } = render(
      <InputField placeholder="Enter text" onChange={handleChange} readonly />
    )
    const input = getByPlaceholderText('Enter text')
    fireEvent.change(input, { target: { value: 'New Value' } })
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('ignores browser autofill until the field is focused', () => {
    const handleChange = jest.fn()
    const { getByPlaceholderText } = render(
      <InputField
        placeholder="Site title"
        value="Prios Tid"
        onChange={handleChange}
        blockAutofill
      />
    )
    const input = getByPlaceholderText('Site title')
    expect(input).toHaveAttribute('readonly')
    expect(input).toHaveAttribute('autocomplete', 'off')
    fireEvent.change(input, { target: { value: 'circularvet.eu' } })
    expect(handleChange).not.toHaveBeenCalled()

    fireEvent.mouseDown(input)
    expect(input).not.toHaveAttribute('readonly')

    fireEvent.focus(input)
    expect(input).not.toHaveAttribute('readonly')
    fireEvent.change(input, { target: { value: 'Prios Tid edited' } })
    expect(handleChange).toHaveBeenCalledWith('Prios Tid edited')
  })

  it('uses a new-password autocomplete token while blocking autofill', () => {
    const { getByPlaceholderText } = render(
      <InputField
        placeholder="Secret"
        blockAutofill
        autoComplete="new-password"
      />
    )
    const input = getByPlaceholderText('Secret')
    expect(input).toHaveAttribute('autocomplete', 'new-password')
    expect(input).toHaveAttribute('readonly')
  })
})
