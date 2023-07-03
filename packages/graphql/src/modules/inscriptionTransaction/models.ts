import { InscriptionTransaction } from "../../generated-types/graphql";
import { InscriptionFundingModel } from "../inscriptionFunding/models";
import { InscriptionTransactionContentModel } from "../inscriptionRequest/models";

export class InscriptionTransactionModel implements InscriptionTransaction {
  private readonly inscriptionFunding: InscriptionFundingModel;

  constructor(inscriptionFunding: InscriptionFundingModel) {
    this.inscriptionFunding = inscriptionFunding;
  }

  public get initScript() {
    return this.inscriptionFunding.initScript;
  }

  public get initTapKey() {
    return this.inscriptionFunding.initTapKey;
  }

  public get initCBlock() {
    return this.inscriptionFunding.initCBlock;
  }

  public get initLeaf() {
    return this.inscriptionFunding.initLeaf;
  }

  public get inscriptions(): InscriptionTransactionContentModel[] {
    return this.inscriptionFunding.inscriptions.map(
      (inscription) => new InscriptionTransactionContentModel(inscription)
    );
  }

  public get overhead() {
    return this.inscriptionFunding.overhead;
  }

  public get padding() {
    return this.inscriptionFunding.padding;
  }

  public get privateKey() {
    return this.inscriptionFunding.privateKey;
  }
}