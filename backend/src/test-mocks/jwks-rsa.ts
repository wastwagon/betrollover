type SigningKey = {
  getPublicKey: () => string;
};

type JwksClient = {
  getSigningKey: (kid: string) => Promise<SigningKey>;
};

export = function jwksRsa(): JwksClient {
  return {
    async getSigningKey(_kid: string): Promise<SigningKey> {
      return {
        getPublicKey: () => 'mock-public-key',
      };
    },
  };
};
