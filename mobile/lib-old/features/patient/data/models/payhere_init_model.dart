class PayHereInitModel {
  final String merchantId;
  final String orderId;
  final String items;
  final double amount;
  final String formattedAmount;
  final String currency;
  final String hash;
  final String checkoutUrl;
  final String returnUrl;
  final String cancelUrl;
  final String notifyUrl;
  final String firstName;
  final String lastName;
  final String email;
  final String phone;
  final String address;
  final String city;
  final String country;

  const PayHereInitModel({
    required this.merchantId,
    required this.orderId,
    required this.items,
    required this.amount,
    required this.formattedAmount,
    this.currency = 'LKR',
    required this.hash,
    required this.checkoutUrl,
    required this.returnUrl,
    required this.cancelUrl,
    required this.notifyUrl,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.phone,
    required this.address,
    required this.city,
    this.country = 'Sri Lanka',
  });

  factory PayHereInitModel.fromJson(Map<String, dynamic> json) {
    return PayHereInitModel(
      merchantId: json['merchantId']?.toString() ?? '',
      orderId: json['orderId']?.toString() ?? '',
      items: json['items']?.toString() ?? '',
      amount: (json['amount'] is num) ? (json['amount'] as num).toDouble() : 0.0,
      formattedAmount: json['formattedAmount']?.toString() ?? '0.00',
      currency: json['currency']?.toString() ?? 'LKR',
      hash: json['hash']?.toString() ?? '',
      checkoutUrl: json['checkoutUrl']?.toString() ?? '',
      returnUrl: json['returnUrl']?.toString() ?? '',
      cancelUrl: json['cancelUrl']?.toString() ?? '',
      notifyUrl: json['notifyUrl']?.toString() ?? '',
      firstName: json['firstName']?.toString() ?? '',
      lastName: json['lastName']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      city: json['city']?.toString() ?? '',
      country: json['country']?.toString() ?? 'Sri Lanka',
    );
  }
}
