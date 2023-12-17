const { ethers, getNamedAccounts, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert } = require("chai")
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async function () {
          let fundMe
          let deployer
          const sendValue = ethers.parseEther("1")
          beforeEach(async function () {
              deployer = await getNamedAccounts()
              const signer = await ethers.provider.getSigner()
              fundMe = await ethers.getContract("FundMe", signer)
          })

          it("allows people to fund and withdraw", async function () {
              await fundMe.fund({ value: sendValue })
              await fundMe.withdraw()
              const endingBalance = await fundMe.runner.provider.getBalance(
                  fundMe.target,
              )
              assert.equal(endingBalance, 0)
          })
      })
