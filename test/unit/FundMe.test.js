const { assert, expect } = require("chai");
const { ethers, getNamedAccounts, deployments } = require("hardhat");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", function () {
      let FundMe;
      let MockV3Aggregator;
      let deployer;
      const sendValue = ethers.utils.parseEther("1"); //1ETH
      beforeEach(async () => {
        // const accounts = await ethers.getSigners()
        // deployer = accounts[0]
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        FundMe = await ethers.getContract("FundMe", deployer);
        MockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });

      describe("constructor", function () {
        it("sets the aggregator addresses correctly", async () => {
          const response = await FundMe.s_priceFeed();
          assert.equal(response, MockV3Aggregator.address);
        });
      });

      describe("fund", async function () {
        it("Fails if you don't send enough ETH", async function () {
          await expect(FundMe.fund()).to.be.revertedWith(
            "You need to spend more ETH!"
          );
        });
        it("updated the amount funded data structure", async function () {
          await FundMe.fund({ value: sendValue });
          const response = await FundMe.s_addressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });
        it("Adds funder to array of s_funders", async function () {
          await FundMe.fund({ value: sendValue });
          const funder = await FundMe.s_funders(0);
          assert.equal(funder, deployer);
        });
      });
      describe("withdraw", async function () {
        beforeEach(async function () {
          await FundMe.fund({ value: sendValue });
        });
        it("withdraw ETH from a single founder", async function () {
          const startingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const startingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );

          const transactionResponse = await FundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          const endingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const endingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );

          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance),
            endingDeployerBalance.add(gasCost).toString()
          );
        });
        it("allow us to withdraw with multiple s_funders", async function () {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await FundMe.connect(accounts[1]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const startingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );

          const transactionResponse = await FundMe.withdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const endingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );

          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance),
            endingDeployerBalance.add(gasCost).toString()
          );

          await expect(FundMe.s_funders(0)).to.be.reverted;
          for (let i = 1; i < 6; i++) {
            assert.equal(
              await FundMe.s_addressToAmountFunded(accounts[i].address),
              0
            );
          }
        });

        it("Only allows the owner to withdraw", async function () {
          const accounts = ethers.getSigners();
          const attacker = accounts[1];
          const attackerConnectedContract = await FundMe.connect(attacker);
          await expect(attackerConnectedContract.withdraw()).to.be.reverted;
        });

        it("Cheaper withdraw", async function () {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 6; i++) {
            const fundMeConnectedContract = await FundMe.connect(accounts[1]);
            await fundMeConnectedContract.fund({ value: sendValue });
          }
          const startingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const startingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );

          const transactionResponse = await FundMe.cheaperWithdraw();
          const transactionReceipt = await transactionResponse.wait(1);
          const { gasUsed, effectiveGasPrice } = transactionReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);

          const endingFundMeBalance = await FundMe.provider.getBalance(
            FundMe.address
          );
          const endingDeployerBalance = await FundMe.provider.getBalance(
            deployer
          );

          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance),
            endingDeployerBalance.add(gasCost).toString()
          );

          await expect(FundMe.s_funders(0)).to.be.reverted;
          for (let i = 1; i < 6; i++) {
            assert.equal(
              await FundMe.s_addressToAmountFunded(accounts[i].address),
              0
            );
          }
        });
      });
    });
