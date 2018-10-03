export default [
  {
    isPenaltyGroup: true,
    enabled: true,
    penaltyGroupDetails: {
      registrationNumber: '17FFA,17FFB,17FFC',
      location: 'Bury St Edmunds Sector Office(Bury St Edmunds - E. Anglia)',
      date: '03/10/2018',
      amount: 370,
      splitAmounts: [
        {
          type: 'IM',
          amount: 80,
          status: 'UNPAID',
        },
        {
          type: 'FPN',
          amount: 290,
          status: 'UNPAID',
        },
      ],
    },
    paymentCode: '47hsqs103i0',
    penaltyDetails: [
      {
        type: 'IM',
        penalties: [
          {
            complete: true,
            reference: '0246850000551',
            enabled: true,
            paymentCode: '04c7680c6d5955f9',
            issueDate: '03/10/2018',
            vehicleReg: '17FFA',
            formattedReference: '24685-0-551-IM',
            location: 'Bury St Edmunds Sector Office(Bury St Edmunds - E. Anglia)',
            amount: 80,
            status: 'UNPAID',
            type: 'IM',
            typeDescription: 'immobilisation',
          },
        ],
      },
      {
        type: 'FPN',
        penalties: [
          {
            complete: true,
            reference: '3254849651302',
            enabled: true,
            paymentCode: '7d4e74090f834e97',
            issueDate: '03/10/2018',
            vehicleReg: '17FFB',
            formattedReference: '3254849651302',
            location: 'Bury St Edmunds Sector Office(Bury St Edmunds - E. Anglia)',
            amount: 100,
            status: 'UNPAID',
            type: 'FPN',
            typeDescription: 'Fixed Penalty Notice',
          },
          {
            complete: true,
            reference: '320158795420',
            enabled: true,
            paymentCode: 'fae85a841c4ac9e5',
            issueDate: '03/10/2018',
            vehicleReg: '17FFC',
            formattedReference: '320158795420',
            location: 'Bury St Edmunds Sector Office(Bury St Edmunds - E. Anglia)',
            amount: 190,
            status: 'UNPAID',
            type: 'FPN',
            typeDescription: 'Fixed Penalty Notice',
          },
        ],
      },
    ],
    paymentStatus: 'UNPAID',
    nextPayment: {
      PaymentCategory: 'IM',
      TotalAmount: 80,
      PaymentStatus: 'UNPAID',
      Penalties: [
        {
          penaltyGroupId: '47hsqs103i0',
          Offset: 1538576509,
          inPenaltyGroup: true,
          Enabled: true,
          Origin: 'APP',
          VehicleRegistration: '17FFA',
          ID: '0246850000551_IM',
          Value: {
            dateTime: 1538524800,
            siteCode: 73,
            vehicleDetails: {
              regNo: '17FFA',
            },
            referenceNo: '24685-0-551-IM',
            nonEndorsableOffence: [],
            penaltyType: 'IM',
            paymentToken: '04c7680c6d5955f9',
            inPenaltyGroup: true,
            placeWhereIssued: 'Bury St Edmunds Sector Office(Bury St Edmunds - E. Anglia)',
            officerName: 'roadside-payment@dvsagov.onmicrosoft.com',
            penaltyAmount: 80,
            officerID: 'jrV1yNL3QUDl8rjBIHkv9BgKhRUvTSDcKyHhrsqSQeo',
            paymentStatus: 'UNPAID',
          },
          Hash: '76bec246a1c74d179024295c3d5e41bf23aeed47057d9302f21d6b979690e891',
        },
      ],
    },
  },
];
