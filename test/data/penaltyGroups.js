export default [
  {
    ID: '47hsqs103i0',
    PaymentStatus: '<UNPAID|PAID>',
    VehicleRegistration: 'AB 123 CD',
    Timestamp: '<unix timestamp>',
    Location: '<Long description of location>',
    Payments: [
      {
        PaymentCategory: 'FPN',
        TotalAmount: 100,
        PaymentStatus: '<UNPAID|PAID>',
        Penalties: [
          {
            Enabled: true,
            Origin: 'APP',
            ID: '1245853256893_FPN',
            Offset: 1519724746.142,
            Value: {
              paymentToken: 'fd7c1abd93c4c074',
              dateTime: 1519689600,
              siteCode: 1,
              vehicleDetails: {
                regNo: 'AA',
              },
              referenceNo: '1245853256893',
              nonEndorsableOffence: [],
              penaltyType: 'FPN',
              placeWhereIssued: 'Abingdon (A34/41 interchange - South of Oxford)',
              officerName: 'dvsa.officerfpns@bjss.com',
              penaltyAmount: 100,
              officerID: 'Z7F6yxnw--6DJf4sLsxjg_S-3Gvrl5MxV-1iY7RRNiA',
              paymentStatus: 'UNPAID',
              paymentAuthCode: '1234TBD',
              paymentRef: '12345678',
              paymentStartTime: 1519689600
            },
            Hash: 'b9db158e491451adf1fd8c9a3b1cfba5212b6fa84e1079f585e0a90a4b823af1',
          },
        ],
      },
    ],
  },
];
