import React from 'react'

import { fireEvent, render, screen } from '@testing-library/react'

import { Autofill } from './index'

jest.mock('lockwright-lib-ui-react-native-components/icons', () => ({
  CreditCard: () => null
}))

jest.mock('lockwright-lib-vault', () => ({
  RECORD_TYPES: {
    LOGIN: 'login',
    IDENTITY: 'identity',
    CREDIT_CARD: 'creditCard'
  },
  generateOtpCodesByIds: jest.fn(),
  useVault: () => ({ refetch: jest.fn() })
}))

jest.mock('../../../shared/components/RecordItem', () => ({
  RecordItem: ({ title }) => <span>{title}</span>
}))

jest.mock('../../../shared/context/RouterContext', () => ({
  useRouter: () => ({
    state: {
      pageOrigin: 'https://page.example',
      iframeId: 'iframe-1',
      iframeType: 'autofill',
      recordType: 'login'
    }
  })
}))

jest.mock('../../hooks/useFilteredRecords', () => ({
  useFilteredRecords: () => ({
    filteredRecords: [
      {
        id: 'rec-1',
        type: 'login',
        data: { title: 'Example', username: 'alice', password: 's3cret' }
      }
    ]
  })
}))

jest.mock('../../iframeApi/setIframeStyles', () => ({
  setIframeStyles: jest.fn()
}))

describe('Autofill', () => {
  it('posts credentials to the page origin, never *', () => {
    const postMessage = jest
      .spyOn(window.parent, 'postMessage')
      .mockImplementation(() => {})

    render(<Autofill />)
    fireEvent.click(screen.getByText('Example'))

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'autofillLogin' }),
      'https://page.example'
    )
  })
})
