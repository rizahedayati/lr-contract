// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.6;

/**
 * @title INonMinted1155Marketplace
 * @dev Interface for a marketplace managing non-minted ERC1155 asset sell orders.
 */
interface ILootBox {
    // Struct representing a non-minted sell order for an ERC1155 asset.
    struct LootBoxSell {
        uint256 price; // The price at which the asset is being sold.
        uint256 sellUnit; // The unit of the asset being sold in each transaction.
        uint256 listedAmount; // The total amount of the asset listed for sale.
        uint256 soldAmount; // The amount of the asset that has been sold.
        uint8 status; //Indicates the status of the sell order. 0: Started, 1: Sold, 2: Canceled
    }

    /**
     * @dev Emitted when the lootBox capacity is updated.
     * @param lootBoxCapacity The maximum lootBox capacity.
     */
    event UpdatedLootBoxCapacity(uint256 lootBoxCapacity);

    /**
     * @dev Event emitted when a new sell order is created.
     * @param sellId The unique identifier of the sell order.
     * @param price The price per unit of the asset.
     * @param sellUnit The unit of the asset being sold in each transaction.
     * @param listedAmount The total amount of the asset listed for sale.
     */
    event SellCreated(
        uint256 sellId,
        uint256 price,
        uint256 sellUnit,
        uint256 listedAmount
    );

    /**
     * @dev Event emitted when an existing sell order is updated.
     * @param sellId The unique identifier of the sell order.
     * @param price The updated price per unit of the asset.
     * @param sellUnit The updated unit of the asset being sold in each transaction.
     * @param listedAmount The updated total amount of the asset listed for sale.

     */
    event SellUpdated(
        uint256 sellId,
        uint256 price,
        uint256 sellUnit,
        uint256 listedAmount
    );

    /**
     * @dev Emitted when a sell listing is canceled.
     * @param sellId The Id of the sell listing that was canceled.
     */
    event SellCanceled(uint256 sellId);

    /**
     * @dev Emitted when a non-minted ERC1155 item is successfully purchased on the marketplace using LRT.
     * @param sellId The unique identifier of the sell order.
     * @param buyer The address of the buyer who purchased the item.
     * @param sellUnit The amount of the asset that was purchased in this transaction.
     * @param price Price of the asset.
     */
    event LootBoxBoughtWithBalance(
        uint256 sellId,
        address buyer,
        uint256 sellUnit,
        uint256 price
    );

    /**
     * @dev Emitted when a non-minted ERC1155 item is successfully purchased on the marketplace using LRT vesting.
     * @param sellId The unique identifier of the sell order.
     * @param buyer The address of the buyer who purchased the item.
     * @param sellUnit The amount of the asset that was purchased in this transaction.
     * @param price Price of the asset.
     */
    event LootBoxBoughtWithVesting(
        uint256 sellId,
        address buyer,
        uint256 sellUnit,
        uint256 price
    );

    /**
     * @dev Emitted when a loot box revealed for a given buyer.
     * @param sellId The ID of the loot box sale.
     * @param collection The address of the collection contract.
     * @param tokenId The ID of the token to mint.
     * @param buyer The address of the buyer receiving the item.
     */
    event LootBoxRevealed(
        uint256 sellId,
        address collection,
        uint256 tokenId,
        address buyer
    );

    /**
     * @dev Emitted when a loot box of a corresponding batch revealed for a given buyer.
     * @param index index of sellId.
     * @param sellId The ID of the loot box sale.
     * @param collection The address of the collection contract.
     * @param tokenId The ID of the token to mint.
     * @param buyer The address of the buyer receiving the item.
     */
    event LootBoxBatchRevealed(
        uint8 index,
        uint256 sellId,
        address collection,
        uint256 tokenId,
        address buyer
    );

    /**
     * @dev Emitted when a loot box of a corresponding batch revealed for a given buyer.
     * @param sellId The ID of the loot box sale.
     * @param buyer The address of the buyer receiving the item.
     */
    event BatchRevealCompleted(uint256 sellId, address buyer);

    /**
     * @dev Emitted when funds are withdrawn from the contract.
     * @param amount The amount of funds withdrawn.
     * @param recipient The address that received the withdrawn funds.
     */
    event Withdrawn(uint256 amount, address recipient);

    /**
     * @dev Initializes the LootBox contract.
     * @param _accessRestrictionAddress The address of the access restriction contract.
     * @param _lrtAddress The address of the LRT contract.
     * @param _landrockerAddress The address of the LandRocker contract.
     * @param _lrtVestingAddress Address of the LRTVesting contract.
     */
    function initializeLootBox(
        address _accessRestrictionAddress,
        address _lrtAddress,
        address _landrockerAddress,
        address _lrtVestingAddress
    ) external;

    /**
     * @dev Sets the maximum lootBox capacity allowed by the contract.
     * @param _lootBoxCapacity The maximum lootBox capacity.
     */
    function setLootBoxCapacity(uint256 _lootBoxCapacity) external;

    /**
     * @dev Creates a new sell order for a lootBox asset.
     * @param _price The price of the asset in LRT tokens.
     * @param _sellUnit The unit of the asset being sold in each transaction.
     * @param _listedAmount The total amount of the asset to be listed for sale.
     */
    function createSell(
        uint256 _price,
        uint256 _sellUnit,
        uint256 _listedAmount
    ) external;

    /**
     * @dev Edits an existing non-minted sell order for an ERC1155 asset.
     * @param _sellId The Id of the sell order to be edited.
     * @param _price The price of the asset in LRT tokens.
     * @param _sellUnit The unit of the asset being sold in each transaction.
     * @param _listedAmount The total amount of the asset to be listed for sale.
     */
    function editSell(
        uint256 _sellId,
        uint256 _price,
        uint256 _sellUnit,
        uint256 _listedAmount
    ) external;

    /**
     * @dev Allows the seller to cancel a sell listing.
     * @param _sellId The Id of the sell listing to be canceled.
     */
    function cancelSell(uint256 _sellId) external;

    /**
     * @dev Buy an item from the lootBox.
     * @param _sellId The Id of the sell listing to buy.
     */
    function buyItem(uint256 _sellId) external;

    /**
     * @dev Withdraws a specified amount of LRT tokens to the treasury.
     * @param _amount The amount of LRT tokens to withdraw.
     */
    function withdraw(uint256 _amount) external;

    /**
     * @dev Reveals a loot box for a given buyer.
     * @param _sellId The ID of the loot box sale.
     * @param _collection The address of the collection contract.
     * @param _tokenId The ID of the token to mint.
     * @param _buyer The address of the buyer receiving the item.
     */
    function revealItem(
        uint256 _sellId,
        address _collection,
        uint256 _tokenId,
        address _buyer
    ) external;

    /**
     * @dev Reveals a batch of loot box for a given buyer.
     * @param _sellId The ID of the loot box sale.
     * @param _collections An array of the address of collections.
     * @param _tokenIds An array of the tokenIds to mint.
     * @param _buyer The address of the buyer receiving the item.
     */
    function revealBatchItem(
        uint256 _sellId,
        address[] calldata _collections,
        uint256[] calldata _tokenIds,
        address _buyer
    ) external;

    /**
     * @dev Provides details of a specific loot box sale
     * @param _sellId The ID of the loot box sale
     * @return price The price of the loot box
     * @return sellUnit The unit of sale for the loot box
     * @return listedAmount The total amount of loot boxes listed for sale
     * @return soldAmount The total amount of loot boxes sold
     * @return status The status of the loot box sale
     */
    function lootBoxSells(
        uint256 _sellId
    )
        external
        view
        returns (
            uint256 price,
            uint256 sellUnit,
            uint256 listedAmount,
            uint256 soldAmount,
            uint8 status
        );

    /**
     * @dev Provides the count of loot boxes a user has for a specific sale ID
     * @param _user The address of the user
     * @param _sellId The ID of the loot box sale
     * @return userLootBoxesCount The count of loot boxes the user has for the specified sale ID
     */

    function userLootBoxes(
        address _user,
        uint256 _sellId
    ) external view returns (uint16 userLootBoxesCount);

    /**
     * @dev Returns the lootBox capacity of the contract for all users.
     * @return The lootBox capacity.
     */
    function lootBoxCapacity() external view returns (uint256);

    /**
     * @dev Returns the total lootBox created.
     * @return The total lootBox.
     */
    function totalCreatedLootBox() external view returns (uint256);
}
